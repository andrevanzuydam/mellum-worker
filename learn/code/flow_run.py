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
TOP_TOOLS = "plan,review_plan,code,review_code,test,read"
WORKFLOW = (
    "Your VERY FIRST action MUST be to call the `plan` tool, passing the ENTIRE task text as its "
    "`task` argument. Do not reply with prose, do not summarise, do not stop — call `plan` now. "
    "You are DONE only when `test` returns TESTS: PASS; never stop before that.\n\n"
    "You COORDINATE building a solution to the task by CALLING TOOLS — you do not read or "
    "edit project files yourself. Each phase is a tool:\n"
    "  plan(task)       — writes TODO.md (a `## North Star` goal + a checklist).\n"
    "  review_plan()    — judges the plan; returns REVIEW: PASS or REVIEW: REDO + reasons.\n"
    "  code(feedback?)  — implements the plan and runs tests.\n"
    "  review_code()    — judges the code; returns REVIEW: PASS or REVIEW: REDO + reasons.\n"
    "  test()           — runs the suite; returns TESTS: PASS or TESTS: FAIL + output.\n\n"
    "TERMINATION — this overrides everything else: `test` is the ONLY exit. The MOMENT test "
    "returns `TESTS: PASS`, you are DONE — stop immediately and call NO further tool. Do not "
    "review, read or code after a passing test.\n\n"
    "Workflow (pass every reviewer/test reason forward to the next call):\n"
    "  1. Call plan with the FULL task text.\n"
    "  2. Call review_plan. On REDO, call plan again with the task AND the reviewer's reasons; "
    "repeat until PASS.\n"
    "  3. Call code.\n"
    "  4. Call review_code. On REDO, call code again with the reasons; repeat until PASS.\n"
    "  5. Call test. On `TESTS: PASS`, STOP now. On `TESTS: FAIL`, call code again with the "
    "failing output, then call test again; repeat until it passes.\n"
    "Always plan before you code. Never call a tool after a passing test."
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


def run_top(task: str, *, workspace: Path, profile: Path, recorder: Path, provider: str,
            model: str, trace: Path, timeout: float, thinking: str) -> None:
    subfeed = trace.parent / f"{trace.stem}.subfeed"
    subfeed.write_text("")
    argv = [
        "pi", *harness.FLAGS, "--provider", provider, "--model", model,
        "--thinking", thinking, "--no-session",
        "--tools", TOP_TOOLS, "-e", str(FLOW), "-e", str(recorder),
        "--system-prompt", WORKFLOW, task,
    ]
    env = {**os.environ, "PI_CODING_AGENT_DIR": str(profile), "MELLUM_TRACE_FILE": str(trace),
           "MELLUM_FLOW_FEED": str(subfeed)}
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
        os.killpg(child.pid, signal.SIGKILL)
        child.wait()
    finally:
        stop.set()
        feed.join(timeout=2)
        subf.join(timeout=2)
        try:
            os.killpg(child.pid, signal.SIGKILL)  # reap any phase sub-agents
        except ProcessLookupError:
            pass


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


def loop(suite_name: str, *, runs_dir: Path, timeout: float, base_url: str, model_id: str,
         thinking: str, attempts: int) -> dict:
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

    # Index the installed venv for the `lookup` tool up front, so grounded docs are ready
    # whenever the model calls it (index on initial run). Best-effort, in the background:
    # create the venv from the lockfile, then build the BM25 cache.
    docs_lookup = Path(__file__).resolve().parent / "docs_lookup.py"
    subprocess.Popen(
        ["sh", "-c", 'uv sync --frozen >/dev/null 2>&1; python3 "$0" --rebuild warmup >/dev/null 2>&1',
         str(docs_lookup)],
        cwd=workspace, start_new_session=True)

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

    passed = False
    phase_results: list[bool] = []
    done: list[str] = []
    for pnum, ptext in enumerate(phases, start=1):
        title = titles[pnum - 1]
        if pnum == 1:
            base_msg = (f"NORTH STAR: {north_star}\n\n"
                        f"YOUR TASK — phase 1 of {len(phases)}:\n\n{ptext}")
        else:
            base_msg = (
                f"NORTH STAR: {north_star}\n"
                f"PROGRESS SO FAR: already implemented and passing — {'; '.join(done)}.\n"
                f"LAST PHASE: {done[-1]} — built, its tests pass; build on it, do not break it.\n\n"
                f"YOUR TASK — phase {pnum} of {len(phases)}:\n\n{ptext}\n\n"
                "Build on the existing workspace (app.py, models.py, templates/, tests/); keep "
                "every existing route and test working, and do not rewrite what already passes."
            )
        lr.emit(f"\n========== PHASE {pnum}/{len(phases)}: {title} ==========")
        passed = False
        for attempt in range(attempts):
            nudge = "" if attempt == 0 else (
                "\n\nNOTE: work from a previous attempt may already be in the workspace — use read/ls, "
                "then CONTINUE toward passing tests; call plan only if TODO.md is missing."
            )
            run_top(base_msg + nudge, workspace=workspace, profile=run / "profile", recorder=recorder,
                    provider=provider, model=model, trace=run / f"trace-p{pnum}-{attempt}.jsonl",
                    timeout=timeout, thinking=thinking)
            passed, _ = lr.run_tests(workspace, 120.0)
            if passed:
                lr.emit(f"  phase {pnum}: tests PASS")
                break
            lr.emit(f"  phase {pnum} [attempt {attempt + 1}/{attempts}]: tests not passing — re-invoking")
        else:
            lr.emit(f"  phase {pnum}: tests still FAIL after {attempts} attempts — continuing")
        phase_results.append(passed)
        if passed:
            done.append(title)

    graded, _ = harness.score_workspace(workspace, suite)
    todo = (workspace / "TODO.md").exists()
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
    p.add_argument("--attempts", type=int, default=6, help="max orchestrator (re-)invocations per task")
    p.add_argument("--thinking", default="medium", help="orchestrator thinking budget")
    p.add_argument("--runs-dir", type=Path, default=harness.RUNS / "flow")
    p.add_argument("--base-url", default="http://127.0.0.1:8001/v1")
    p.add_argument("--model", default="Mellum2.1-12B-A2.5B-Thinking-6bit")
    args = p.parse_args(argv)
    for name in args.suite.split(","):
        loop(name.strip(), runs_dir=args.runs_dir, timeout=args.timeout,
             base_url=args.base_url, model_id=args.model, thinking=args.thinking,
             attempts=args.attempts)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
