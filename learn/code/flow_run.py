#!/usr/bin/env python3
"""Tool-based workflow runner: ONE `pi` per task; the model orchestrates the phases.

The phases are tools (plan / review_plan / code / review_code / test) registered by
the `mellum-flow` extension; the top agent calls them, driven by the workflow prompt
below. This replaces the external per-phase loop — a capable model orchestrates itself
when the harness offers well-shaped phase tools.

    python3 flow_run.py --suite easy,medium
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import harness  # noqa: E402
import loop_run as lr  # reuse pin_profile, fmt_event, stream_trace, emit, scoring  # noqa: E402

EXT = Path(__file__).resolve().parents[2] / "extensions"
FLOW = EXT / "mellum-flow.ts"
# The top agent gets ONLY the phase tools (+ read to peek). It orchestrates by calling them.
TOP_TOOLS = "plan,review_plan,examine,code,review_code,test,read"
WORKFLOW = (
    "The task for this phase is in the file TASK.md. You COORDINATE building it by CALLING TOOLS. "
    "CRITICAL: every tool takes NO arguments — call them exactly as `plan()`, `review_plan()`, "
    "`code()`, `review_code()`, `test()`. NEVER pass the task text (or any long text) as an "
    "argument; the tools read TASK.md, TODO.md and REVIEW.md themselves. Passing long arguments "
    "breaks the tool call.\n\n"
    "  plan()        — reads TASK.md, writes TODO.md (a `## North Star` goal + a checklist).\n"
    "  review_plan() — judges the plan; returns REVIEW: PASS or REVIEW: REDO.\n"
    "  examine()     — writes the acceptance test (the definition of DONE) from the spec.\n"
    "  code()        — implements to PASS the acceptance test (reads REVIEW.md for feedback).\n"
    "  review_code() — judges the code; returns REVIEW: PASS or REVIEW: REDO.\n"
    "  test()        — runs the acceptance test; returns TESTS: PASS or TESTS: FAIL.\n\n"
    "Your VERY FIRST action is to call `plan()` — no arguments. Do not reply with prose.\n\n"
    "TERMINATION — overrides everything: `test` is the ONLY exit. The MOMENT test returns "
    "`TESTS: PASS`, you are DONE — stop and call NO further tool.\n\n"
    "Workflow:\n"
    "  1. plan()\n"
    "  2. review_plan(). On REDO, call plan() again (it re-reads the feedback); repeat until PASS.\n"
    "  3. examine()  — write the acceptance test from the spec, BEFORE any coding.\n"
    "  4. code()\n"
    "  5. review_code(). On REDO, call code() again; repeat until PASS.\n"
    "  6. test(). On TESTS: PASS, STOP. On TESTS: FAIL, call code() again then test() again; "
    "repeat until it passes.\n"
    "Always plan, then examine, then code. Never call a tool after a passing test."
)


def tail_feed(path: Path, stop: threading.Event) -> None:
    """Tail the sub-agent feed file the extension appends to, printing each new line."""
    seen = 0
    while not stop.is_set():
        if path.exists():
            lines = path.read_text(errors="ignore").splitlines()
            for line in lines[seen:]:
                lr.emit(line)
            seen = len(lines)
        time.sleep(0.4)


def reap_group(pid: int) -> None:
    """SIGKILL a child's process group, ignoring the cases where there is nothing to kill.
    ProcessLookupError: the group already exited. PermissionError (EPERM): the child exited
    and its pid was recycled into a group we do not own — killing it is neither possible nor
    ours to do. Both are safe to ignore; letting EPERM escape crashed a whole best-of-N run."""
    try:
        os.killpg(pid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        pass


def run_top(task: str, *, workspace: Path, profile: Path, recorder: Path, provider: str,
            model: str, trace: Path, timeout: float, thinking: str, phase: int = 1) -> None:
    subfeed = trace.parent / f"{trace.stem}.subfeed"
    subfeed.write_text("")
    argv = [
        "pi", *harness.FLAGS, "--provider", provider, "--model", model,
        "--thinking", thinking, "--no-session",
        "--tools", TOP_TOOLS, "-e", str(FLOW), "-e", str(recorder),
        "--system-prompt", WORKFLOW, task,
    ]
    # MELLUM_PHASE tells the examiner which phase it is writing for, so each phase's
    # acceptance test is frozen under its own name and the gate ACCUMULATES — a later
    # phase can never pass by regressing an earlier one.
    env = {**os.environ, "PI_CODING_AGENT_DIR": str(profile), "MELLUM_TRACE_FILE": str(trace),
           "MELLUM_FLOW_FEED": str(subfeed), "MELLUM_PHASE": str(phase)}
    lr.emit(f"\n━━━ orchestrator (think={thinking}) ━━━")
    stop = threading.Event()
    feed = threading.Thread(target=lr.stream_trace, args=(trace, "[flow]", stop), daemon=True)
    feed.start()
    subf = threading.Thread(target=tail_feed, args=(subfeed, stop), daemon=True)
    subf.start()
    child = subprocess.Popen(argv, cwd=workspace, env=env, start_new_session=True)
    try:
        child.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        reap_group(child.pid)
        child.wait()
    finally:
        stop.set()
        feed.join(timeout=2)
        subf.join(timeout=2)
        reap_group(child.pid)  # reap any phase sub-agents


def decompose(task: str) -> list[str]:
    """Split a task into small, ordered units for one-at-a-time implementation.

    The model cannot bound its reasoning (`supportsReasoningEffort: false`), so a big task
    drowns it. Split on the structure the text already has — Phase/Step headers at ANY level
    first (so `# Phase 5` groups with `## Phase 1`), then any markdown header — so each unit is
    small. A task with no structure stays one unit (model-splitting an unstructured wall is the
    parked backlog item). Returns the slices in order.
    """
    for pat in (r"(?m)^(?=#{1,6}\s*(?:Phase|Step)\b)", r"(?m)^(?=#{1,6}\s+\S)"):
        parts = [p.strip() for p in re.split(pat, task) if p.strip()]
        if len(parts) > 1:
            return parts
    return [task]


def phase_title(slice_text: str) -> str:
    """A one-line title for a phase slice (its first heading, hashes stripped)."""
    first = slice_text.lstrip().splitlines()[0] if slice_text.strip() else "task"
    return first.lstrip("#").strip()[:80]


ORIENT = (
    "You are ORIENTING a build, not doing it. You are given the list of phase titles for a task "
    "(and specs/ may be present to read). In ONE short line, state the NORTH STAR — the overall "
    "goal of the finished app, one sentence. Output ONLY that one line: no preamble, no list, no "
    "code, no markdown."
)


def run_orient(titles: str, *, workspace: Path, profile: Path, recorder: Path, provider: str,
               model: str, trace: Path, timeout: float) -> str:
    """Ask the model for the one-line north star from the phase titles. Best-effort + fallback."""
    argv = [
        "pi", *harness.FLAGS, "--provider", provider, "--model", model,
        "--thinking", "off", "--no-session", "--tools", "read,grep,find,ls",
        "-e", str(recorder), "--system-prompt", ORIENT,
        f"Phase titles, in order:\n{titles}\n\nState the north star in one line.",
    ]
    env = {**os.environ, "PI_CODING_AGENT_DIR": str(profile), "MELLUM_TRACE_FILE": str(trace)}
    child = subprocess.Popen(argv, cwd=workspace, env=env, start_new_session=True)
    try:
        child.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        os.killpg(child.pid, signal.SIGKILL)
        child.wait()
    finally:
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    for line in lr.final_text(trace).splitlines():
        line = line.strip().lstrip("#").strip()
        if line:
            return line[:200]
    return "Build the complete application described across all the phases."


def fork_workspace(base: Path, dest: Path) -> None:
    """A fresh copy of the workspace SOURCE for an independent attempt. The venv is shared
    read-only (`uv run --frozen` does not mutate it), so forking is cheap."""
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    for item in base.iterdir():
        if item.name == ".venv":
            os.symlink(item.resolve(), dest / ".venv")
        elif item.is_dir():
            shutil.copytree(item, dest / item.name)
        else:
            shutil.copy2(item, dest / item.name)


def promote(winner: Path, base: Path) -> None:
    """Make the winning attempt the new shared workspace: replace the source, keep the venv."""
    for item in list(base.iterdir()):
        if item.name == ".venv":
            continue
        shutil.rmtree(item) if item.is_dir() else item.unlink()
    for item in winner.iterdir():
        if item.name == ".venv":
            continue
        if item.is_dir():
            shutil.copytree(item, base / item.name)
        else:
            shutil.copy2(item, base / item.name)


def restore_gate(workspace: Path) -> None:
    """Re-materialise EVERY frozen per-phase acceptance test into tests/ before the
    authoritative scoring run. This makes the gate cumulative: a later phase cannot
    pass by regressing an earlier one, and a coder that edited or deleted a gate file
    gets it restored. The examiner froze each phase under plan/gate/phase_<n>.py."""
    gate = workspace / "plan" / "gate"
    if not gate.is_dir():
        return  # single-phase easy runs may freeze a single file instead; nothing to do
    tests = workspace / "tests"
    tests.mkdir(exist_ok=True)
    for stale in tests.glob("test_gate_phase_*.py"):
        stale.unlink()
    for frozen in sorted(gate.glob("phase_*.py")):
        shutil.copy2(frozen, tests / f"test_gate_{frozen.stem}.py")


def gate_files(workspace: Path) -> list[Path]:
    """The restored cumulative acceptance gate — tests/test_gate_phase_*.py — and nothing else.
    The phase is judged on this, the frozen definition of DONE, never on the coder's own scratch
    tests: a brittle coder test (e.g. a list-equality order check polluted by shared in-memory
    state) must not fail a build that passes the authoritative gate. Empty when no cumulative gate
    was frozen (the single-file easy gate), so callers fall back to the whole suite."""
    tests = workspace / "tests"
    return sorted(tests.glob("test_gate_phase_*.py")) if tests.is_dir() else []


def run_gate(workspace: Path, timeout: float) -> tuple[bool, str]:
    """Score the workspace against the frozen acceptance gate only (see gate_files). Falls back to
    the whole suite when there is no cumulative gate. Mirrors loop_run.run_tests' env so
    `from app import app` resolves exactly as the hidden grader sees it."""
    gates = gate_files(workspace)
    if not gates:
        return lr.run_tests(workspace, timeout)
    env = {**os.environ, "PYTHONPATH": str(workspace)}
    cmd = ["uv", "run", "--with", "pytest", "pytest", "-q",
           *[str(g.relative_to(workspace)) for g in gates]]
    try:
        proc = subprocess.run(cmd, cwd=workspace, capture_output=True, text=True,
                              timeout=timeout, check=False, env=env)
    except subprocess.TimeoutExpired:
        return False, "gate tests timed out"
    out = proc.stdout + proc.stderr
    return proc.returncode == 0, "\n".join(out.splitlines()[-25:])


def phase_gate_ok(workspace: Path, phase: int) -> bool:
    """A fork may only count as passing phase N if it actually FROZE a real acceptance
    test for phase N. Without this, a fork whose examiner produced nothing just inherits
    the earlier phases' gate and 'passes' trivially — and best-of-N then promotes that
    weakest fork first. The frozen file must exist, be importable Python (an examiner that
    emitted an HTML blob fails here), and define at least one test."""
    f = workspace / "plan" / "gate" / f"phase_{phase}.py"
    if not f.is_file():
        return False
    text = f.read_text()
    try:
        compile(text, str(f), "exec")
    except SyntaxError:
        return False
    return re.search(r"(?m)^\s*(async\s+)?def\s+test\w*\s*\(|^\s*class\s+Test\w*", text) is not None


def pin_temperature(profile_dir: Path, temp: float) -> None:
    """Set the sampling temperature in a per-attempt profile, to SPREAD the best-of-N samples:
    low temps write the by-the-book correct code, high temps explore out of a stuck solution."""
    mp = profile_dir / "models.json"
    data = json.loads(mp.read_text())
    _, prov = next(iter(data["providers"].items()))
    prov["models"][0].setdefault("samplingParams", {})["temperature"] = temp
    mp.write_text(json.dumps(data, indent=2) + "\n")


def temp_ladder(n: int) -> list[float]:
    """A temperature spread across n parallel attempts (0.3 conservative → 1.2 exploratory)."""
    if n <= 1:
        return [0.7]
    return [round(0.3 + 0.9 * i / (n - 1), 2) for i in range(n)]


def loop(suite_name: str, *, runs_dir: Path, timeout: float, base_url: str, model_id: str,
         thinking: str, attempts: int, concurrency: int) -> dict:
    suite = harness.load_suite(harness.SUITES, suite_name)
    run = harness.new_run(runs_dir, f"flow-{suite_name}")
    workspace = run / "workspace"
    workspace.mkdir()
    lr._FEED_PATH = run / "feed.log"
    started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if suite.root is not None and (suite.root / "base").is_dir():
        shutil.copytree(suite.root / "base", workspace, dirs_exist_ok=True)
    shutil.copytree(harness.PROFILE, run / "profile")
    lr.pin_profile(run / "profile", base_url, model_id)
    recorder = run / "record-pi.mjs"
    shutil.copy2(harness.RECORDER, recorder)
    provider, model = harness.profile_pin(run / "profile")
    task = "\n\n".join(suite.prompts)

    # Create the venv from the lockfile (synchronously — parallel attempts fork it) and index it
    # for the `lookup` tool. uv sync blocks; the BM25 index builds in the background.
    docs_lookup = Path(__file__).resolve().parent / "docs_lookup.py"
    subprocess.run(["uv", "sync", "--frozen"], cwd=workspace, capture_output=True, timeout=300, check=False)
    subprocess.Popen(["python3", str(docs_lookup), "--rebuild", "warmup"], cwd=workspace,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)

    # Decompose into phases and drive ONE at a time over the shared workspace, so each
    # orchestrator run gets a small, answerable task. Each phase carries a small, constant
    # FORWARD CONTEXT — a model-determined north star, a running summary of what is already
    # built, and the last phase's context — so a decomposed step stays grounded without ever
    # handing the model the whole task. Within a phase the orchestrator runs in -p mode and can
    # stall on turn 1, so we re-invoke it (it resumes from the workspace) until that phase's
    # tests pass or the attempt budget runs out.
    phases = decompose(task)
    titles = [phase_title(p) for p in phases]
    lr.emit(f"  decomposed into {len(phases)} phase(s): " + " | ".join(titles))
    if len(phases) > 1:
        north_star = run_orient(
            "\n".join(f"{i}. {t}" for i, t in enumerate(titles, 1)),
            workspace=workspace, profile=run / "profile", recorder=recorder,
            provider=provider, model=model, trace=run / "trace-orient.jsonl",
            timeout=min(timeout, 150.0))
    else:
        north_star = titles[0]
    lr.emit(f"  north star: {north_star}")

    # One independent best-of-N attempt: fork the workspace, run the orchestrator at its own
    # sampling temperature, report whether that fork's tests pass. Run concurrently so the
    # batched oMLX server actually fills — this is where the concurrency we unlocked turns into
    # speed, and best-of-N beats the per-phase variance of a single try.
    # The orchestrator's own message is SHORT — the phase task lives in TASK.md (forked into each
    # attempt), and every tool is argument-free, so the model never generates a large tool-call
    # argument (which oMLX's parser drops, the root cause of the "stalls").
    orch_msg = ("The task for this phase is in TASK.md. Build it by calling the tools — all take "
                "NO arguments. Start now by calling plan().")

    def one_attempt(pnum: int, rnd: int, idx: int, temp: float):
        aw = run / f"p{pnum}-r{rnd}-t{idx}"
        fork_workspace(workspace, aw)
        prof = run / f"profile-t{idx}"
        if not prof.exists():
            shutil.copytree(run / "profile", prof)
            pin_temperature(prof, temp)
        run_top(orch_msg, workspace=aw, profile=prof, recorder=recorder, provider=provider,
                model=model, trace=run / f"trace-p{pnum}-r{rnd}-{idx}.jsonl",
                timeout=timeout, thinking=thinking, phase=pnum)
        restore_gate(aw)  # score against the cumulative gate — every prior phase must still pass
        ok, _ = run_gate(aw, 120.0)
        ok = ok and phase_gate_ok(aw, pnum)  # and THIS phase must have frozen a real acceptance test
        return idx, ok, aw

    passed = False
    phase_results: list[bool] = []
    done: list[str] = []
    for pnum, ptext in enumerate(phases, start=1):
        title = titles[pnum - 1]
        if pnum == 1:
            base_msg = (f"NORTH STAR: {north_star}\n\n"
                        f"YOUR TASK — phase 1 of {len(phases)}:\n\n{ptext}")
        else:
            progress = (
                f"PROGRESS SO FAR: already implemented and passing — {'; '.join(done)}.\n"
                f"LAST PHASE: {done[-1]} — built, its tests pass; build on it, do not break it.\n\n"
                if done else
                "PROGRESS SO FAR: earlier phase(s) did NOT pass — implement this phase on the "
                "workspace as it currently stands.\n\n"
            )
            base_msg = (
                f"NORTH STAR: {north_star}\n"
                + progress
                + f"YOUR TASK — phase {pnum} of {len(phases)}:\n\n{ptext}\n\n"
                + "Build on the existing workspace (app.py, models.py, templates/, tests/); keep "
                "every existing route and test working, and do not rewrite what already passes."
            )
        # The phase task (north star + progress + spec) goes in plan/TASK.md — NOT a tool argument.
        (workspace / "plan").mkdir(exist_ok=True)
        (workspace / "plan" / "TASK.md").write_text(base_msg)
        (workspace / "plan" / "REVIEW.md").unlink(missing_ok=True)  # fresh feedback per phase
        lr.emit(f"\n========== PHASE {pnum}/{len(phases)}: {title} ==========")
        passed = False
        for rnd in range(attempts):
            if concurrency <= 1:
                nudge = "" if rnd == 0 else (
                    " Work from a previous attempt may already be in the workspace — continue toward "
                    "passing tests; call plan() only if TODO.md is missing."
                )
                run_top(orch_msg + nudge, workspace=workspace, profile=run / "profile", recorder=recorder,
                        provider=provider, model=model, trace=run / f"trace-p{pnum}-{rnd}.jsonl",
                        timeout=timeout, thinking=thinking, phase=pnum)
                restore_gate(workspace)  # score against the cumulative gate — every prior phase must still pass
                passed, _ = run_gate(workspace, 120.0)
                passed = passed and phase_gate_ok(workspace, pnum)  # and THIS phase must have frozen a real acceptance test
            else:
                temps = temp_ladder(concurrency)
                lr.emit(f"  phase {pnum} round {rnd + 1}: {concurrency} parallel attempts, temps {temps}")
                winner = None
                with cf.ThreadPoolExecutor(max_workers=concurrency) as ex:
                    futs = [ex.submit(one_attempt, pnum, rnd, i, temps[i]) for i in range(concurrency)]
                    for fut in cf.as_completed(futs):
                        i, ok, aw = fut.result()
                        lr.emit(f"  phase {pnum} try{i} (t={temps[i]}): {'PASS' if ok else 'fail'}")
                        if ok and winner is None:
                            winner = aw
                if winner is not None:
                    promote(winner, workspace)
                    passed = True
            if passed:
                lr.emit(f"  phase {pnum}: tests PASS")
                break
            lr.emit(f"  phase {pnum} round {rnd + 1}/{attempts}: no pass — retrying")
        if not passed:
            lr.emit(f"  phase {pnum}: still FAIL after {attempts} round(s) — continuing")
        phase_results.append(passed)
        if passed:
            done.append(title)

    graded, _ = harness.score_workspace(workspace, suite)
    todo = (workspace / "plan" / "TODO.md").exists()
    result = {
        "suite": suite_name, "visible": passed, "graded": graded, "todo": todo,
        "phases": len(phases), "phase_results": phase_results, "north_star": north_star,
        "model": model_id, "thinking": thinking, "started": started,
        "finished": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (run / "result.json").write_text(json.dumps(result, indent=2) + "\n")
    lr.emit(f"{suite_name}: visible={'PASS' if passed else 'FAIL'} "
            f"hidden-grader={'PASS' if graded else 'FAIL'} TODO.md={'yes' if todo else 'NO'} bundle={run}")
    lr._FEED_PATH = None
    return result


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--suite", required=True, help="a suite name, or comma-separated names")
    p.add_argument("--timeout", type=float, default=900.0, help="per-attempt wall-clock budget")
    p.add_argument("--attempts", type=int, default=6, help="max rounds per phase (retries / best-of-N rounds)")
    p.add_argument("--concurrency", type=int, default=1,
                   help="parallel attempts per phase (best-of-N on the batched server); 1 = sequential")
    p.add_argument("--thinking", default="medium", help="orchestrator thinking budget")
    p.add_argument("--runs-dir", type=Path, default=harness.RUNS / "flow")
    p.add_argument("--base-url", default="http://127.0.0.1:8001/v1")
    p.add_argument("--model", default="Mellum2.1-12B-A2.5B-Thinking-6bit")
    args = p.parse_args(argv)
    for name in args.suite.split(","):
        loop(name.strip(), runs_dir=args.runs_dir, timeout=args.timeout,
             base_url=args.base_url, model_id=args.model, thinking=args.thinking,
             attempts=args.attempts, concurrency=args.concurrency)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
