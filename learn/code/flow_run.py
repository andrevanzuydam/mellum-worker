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


def gate_files(workspace: Path, phase: int | None = None) -> list[Path]:
    """The restored frozen acceptance gate — tests/test_gate_phase_*.py — and nothing else. The
    phase is judged on this, the frozen definition of DONE, never on the coder's own scratch tests.
    With `phase` set, return only THAT phase's gate; otherwise the whole cumulative set. Scoring a
    phase on its OWN gate stops one stochastically-brittle earlier gate (a false-fail) from
    poisoning every later phase's pass decision — the run's observed failure mode. Regressions are
    caught by the final hidden grade, not by blocking mid-run on a possibly-brittle earlier gate.
    Empty when no gate was frozen (the single-file easy gate), so callers fall back to the suite."""
    tests = workspace / "tests"
    if not tests.is_dir():
        return []
    pat = f"test_gate_phase_{phase}.py" if phase is not None else "test_gate_phase_*.py"
    return sorted(tests.glob(pat))


def run_gate(workspace: Path, timeout: float, phase: int | None = None) -> tuple[bool, str]:
    """Score the workspace against the frozen acceptance gate (see gate_files). With `phase`, score
    only that phase's own gate. Falls back to the whole suite when there is no frozen gate. Mirrors
    loop_run.run_tests' env so `from app import app` resolves exactly as the hidden grader sees it."""
    gates = gate_files(workspace, phase)
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


def seeded_done(titles: list[str], start_phase: int) -> list[str]:
    """When resuming at `start_phase`, the earlier phases are assumed already built and passing.
    Their titles seed the `done` list so the forward-context message lists them as implemented."""
    return list(titles[: max(0, start_phase - 1)])


def seed_from_bundle(seed: Path, workspace: Path, start_phase: int) -> None:
    """Resume at phase `start_phase` by seeding `workspace` from a PRIOR run's `seed` workspace:
    its built app (app.py, models.py, templates/, tests/, data.db, pyproject/uv.lock) and the
    frozen per-phase gates under plan/gate/. The gates for phases 1..start_phase-1 MUST exist in
    the seed — scoring phase N re-runs the whole cumulative gate. The venv, caches and traces are
    NOT copied (a copied .venv carries stale absolute paths); `uv sync` recreates the venv."""
    if not seed.is_dir():
        raise FileNotFoundError(f"--seed-from workspace not found: {seed}")
    missing = [n for n in range(1, start_phase)
               if not (seed / "plan" / "gate" / f"phase_{n}.py").is_file()]
    if missing:
        raise FileNotFoundError(
            f"seed {seed} has no frozen gate for phase(s) {missing}; cannot resume at phase {start_phase}")
    shutil.copytree(seed, workspace, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns(".venv", "__pycache__", "*.pyc",
                                                  "trace*.jsonl", "*.subfeed", "node_modules"))


def fixture_schema_note(workspace: Path) -> str:
    """Ground the phase on the REAL fixture schema: list each persistent table's actual columns, so
    the examiner and coder USE the columns that exist (e.g. a report's real `date` column) instead
    of inventing or renaming one — a prose 'inspect the schema' rule the small model ignores. Empty
    when the workspace ships no database. Agnostic: reflects whatever *.db tables are present."""
    import sqlite3
    lines: list[str] = []
    for db in sorted(workspace.glob("*.db")):
        try:
            con = sqlite3.connect(db)
            try:
                tables = [r[0] for r in con.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
                for t in tables:
                    cols = [r[1] for r in con.execute(f"PRAGMA table_info({t})")]
                    if cols:
                        lines.append(f"  {db.name}.{t}({', '.join(cols)})")
            finally:
                con.close()
        except sqlite3.Error:
            continue
    if not lines:
        return ""
    return ("\n\nEXISTING DATABASE SCHEMA — use these REAL columns; do not invent, rename or assume "
            "a column the data does not have:\n" + "\n".join(lines))


def restore_fixture_data(workspace: Path, base_dir: Path) -> list[str]:
    """Before the authoritative grade, put each fixture table's ROWS back from the suite's pristine
    base database into the workspace database, keeping the workspace's (migrated) schema. A test
    that mutated the fixture — e.g. `DELETE FROM tickets` in a report gate — otherwise corrupts the
    very data the spec's 'report from the database' and the hidden grader read. Columns the fixture
    lacks (added by the coder's migrations) keep their defaults. Agnostic: it mirrors whatever
    tables the base fixture ships, nothing suite-specific. Returns the names of restored dbs."""
    import sqlite3
    restored: list[str] = []
    if not base_dir.is_dir():
        return restored
    for base_db in sorted(base_dir.glob("*.db")):
        ws_db = workspace / base_db.name
        if not ws_db.is_file():
            continue
        src = sqlite3.connect(base_db)
        dst = sqlite3.connect(ws_db)
        try:
            tables = [r[0] for r in src.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
            ws_tables = {r[0] for r in dst.execute(
                "SELECT name FROM sqlite_master WHERE type='table'")}
            for t in tables:
                if t not in ws_tables:
                    continue  # a table the workspace dropped — leave the grade to judge that
                base_cols = [r[1] for r in src.execute(f"PRAGMA table_info({t})")]
                ws_cols = {r[1] for r in dst.execute(f"PRAGMA table_info({t})")}
                cols = [c for c in base_cols if c in ws_cols]  # intersection: tolerate a migrated/renamed schema
                if not cols:
                    continue
                rows = src.execute(f"SELECT {','.join(cols)} FROM {t}").fetchall()
                dst.execute(f"DELETE FROM {t}")
                if rows:
                    ph = ",".join("?" * len(cols))
                    dst.executemany(f"INSERT INTO {t} ({','.join(cols)}) VALUES ({ph})", rows)
            dst.commit()
            restored.append(base_db.name)
        finally:
            src.close()
            dst.close()
    return restored


def loop(suite_name: str, *, runs_dir: Path, timeout: float, base_url: str, model_id: str,
         thinking: str, attempts: int, concurrency: int,
         start_phase: int = 1, seed_from: Path | None = None, context_window: int = 56000) -> dict:
    suite = harness.load_suite(harness.SUITES, suite_name)
    run = harness.new_run(runs_dir, f"flow-{suite_name}")
    workspace = run / "workspace"
    workspace.mkdir()
    lr._FEED_PATH = run / "feed.log"
    started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if start_phase > 1:
        if seed_from is None:
            raise ValueError("--start-phase > 1 requires --seed-from <a prior run's workspace>")
        seed_from_bundle(seed_from, workspace, start_phase)
        lr.emit(f"  resuming at phase {start_phase}, seeded from {seed_from}")
    elif suite.root is not None and (suite.root / "base").is_dir():
        shutil.copytree(suite.root / "base", workspace, dirs_exist_ok=True)
    shutil.copytree(harness.PROFILE, run / "profile")
    lr.pin_profile(run / "profile", base_url, model_id, context_window)
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
        restore_gate(aw)  # materialize every frozen gate so the coder sees them; score THIS phase's own
        ok, _ = run_gate(aw, 120.0, pnum)  # a brittle earlier gate must not poison this phase's pass
        ok = ok and phase_gate_ok(aw, pnum)  # and THIS phase must have frozen a real acceptance test
        return idx, ok, aw

    passed = False
    phase_results: list[bool] = []
    done: list[str] = seeded_done(titles, start_phase)  # earlier phases came from the seed
    for pnum, ptext in enumerate(phases, start=1):
        title = titles[pnum - 1]
        if pnum < start_phase:
            continue  # already built and frozen in the seeded workspace
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
        # Append the REAL fixture schema so the coder/examiner use the columns that exist.
        (workspace / "plan").mkdir(exist_ok=True)
        (workspace / "plan" / "TASK.md").write_text(base_msg + fixture_schema_note(workspace))
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
                restore_gate(workspace)  # materialize every frozen gate for the coder; score THIS phase's own
                passed, _ = run_gate(workspace, 120.0, pnum)  # a brittle earlier gate must not poison this phase
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

    # A report gate can mutate the fixture db (DELETE/INSERT); put the fixture rows back before the
    # authoritative grade so it reads the real data the spec reports "from the database", not a
    # test's leftovers. Keeps the coder's migrated schema.
    if suite.root is not None:
        restored = restore_fixture_data(workspace, suite.root / "base")
        if restored:
            lr.emit(f"  restored fixture data before grading: {', '.join(restored)}")
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
    p.add_argument("--start-phase", type=int, default=1,
                   help="resume at this 1-indexed phase; phases before it are taken from --seed-from")
    p.add_argument("--seed-from", type=Path, default=None,
                   help="a prior run's workspace to seed the built app and earlier frozen gates from "
                        "(required when --start-phase > 1)")
    p.add_argument("--context-window", type=int, default=56000,
                   help="pinned context window; smaller reserves less KV per request so --concurrency "
                        ">1 (best-of-N) fits under the oMLX memory guard. Keep above the largest "
                        "context a phase reaches or it truncates.")
    args = p.parse_args(argv)
    for name in args.suite.split(","):
        loop(name.strip(), runs_dir=args.runs_dir, timeout=args.timeout,
             base_url=args.base_url, model_id=args.model, thinking=args.thinking,
             attempts=args.attempts, concurrency=args.concurrency,
             start_phase=args.start_phase, seed_from=args.seed_from,
             context_window=args.context_window)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
