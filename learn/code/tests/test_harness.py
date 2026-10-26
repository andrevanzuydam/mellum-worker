import json
import time
import re
import os
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import harness

HERE = Path(__file__).resolve().parent
FIX = HERE / "fixtures"
SUITES = FIX / "suites"
PROFILE = HERE.parent / "profile"


def run(tmp_path, binary="fake-pi.sh", task="add"):
    return harness.run_suite(
        harness.load_suite(SUITES, task),
        runs_dir=tmp_path / "runs", profile=PROFILE,
        pi_binary=str(FIX / binary),
    )


def test_load_task_reads_prompt_and_tests():
    task = harness.load_suite(SUITES, "add")
    assert "add(a, b)" in task.prompt
    assert (task.tests / "test_add.py").exists()


def test_a_task_can_hold_prompts_in_order():
    task = harness.load_suite(SUITES, "steps")
    assert task.prompts == [
        "First: write a file named one.txt.",
        "Second: write a file named two.txt.",
    ]
    assert task.prompt == task.prompts[0]


def test_an_empty_prompt_is_named(tmp_path):
    task_dir = tmp_path / "tasks" / "blank"
    task_dir.mkdir(parents=True)
    (task_dir / "task.md").write_text("   \n")
    with pytest.raises(SystemExit) as exc:
        harness.load_suite(tmp_path / "tasks", "blank")
    assert "blank" in str(exc.value)


def test_pi_argv_isolates_the_child():
    task = harness.load_suite(SUITES, "add")
    argv = harness.pi_argv("pi", PROFILE, Path("rec.mjs"), "llamacpp", "model-x",
                           task.prompt)
    for flag in ("-p", "--no-approve", "--no-context-files",
                 "--no-extensions", "--no-skills"):
        assert flag in argv
    assert "--no-session" not in argv
    assert str(Path("rec.mjs")) in argv
    assert argv[argv.index("--provider") + 1] == "llamacpp"
    assert argv[-1] == task.prompt


def test_arms_select_the_extension_and_guards():
    worker = harness.arm_settings("worker")
    assert worker["extension"].name == "mellum-worker.ts"
    no_prompt = harness.arm_settings("no-prompt")
    assert no_prompt["env"]["MELLUM_WORKER_PROMPT"] == "pi"
    no_nudge = harness.arm_settings("no-nudge")
    assert json.loads(no_nudge["env"]["MELLUM_GUARDS"]) == {"loopBreaker": True}
    no_loop = harness.arm_settings("no-loop")
    assert json.loads(no_loop["env"]["MELLUM_GUARDS"]) == {"emptyFinalNudge": 3}
    assert harness.arm_settings("bare")["extension"] is None


def test_two_prompts_share_one_session(tmp_path):
    task = harness.load_suite(SUITES, "steps")
    run_dir = harness.run_suite(
        task, runs_dir=tmp_path / "runs", profile=PROFILE,
        pi_binary=str(FIX / "fake-pi-session.sh"),
    )
    lines = [line.split("|") for line in
             (run_dir / "workspace" / "session-log.txt").read_text().splitlines()]
    assert [line[2] for line in lines] == task.prompts
    assert lines[0][0] == lines[1][0] and lines[0][0]
    assert lines[0][1] == lines[1][1]
    assert str(run_dir) in lines[0][1]
    assert (run_dir / "workspace" / "one.txt").exists()
    assert (run_dir / "workspace" / "two.txt").exists()
    assert not (run_dir / "workspace" / "tests").exists()
    rows = [json.loads(row) for row in
            (run_dir / "trace.jsonl").read_text().splitlines()]
    assert sum(row["type"] == "instance_start" for row in rows) == 2


def test_runs_are_fresh_and_tests_are_hidden(tmp_path):
    first = run(tmp_path)
    assert (first / "workspace" / "add.py").exists()
    assert not (first / "workspace" / "tests").exists()
    assert (first / "profile" / "models.json").exists()
    assert (first / "trace.jsonl").exists()
    assert (first / "workspace" / "profile-path.txt").read_text().strip() \
        == str(first / "profile")
    (first / "workspace" / "stray.txt").write_text("x")
    second = run(tmp_path)
    assert second != first
    assert not (second / "workspace" / "stray.txt").exists()


def test_run_suite_copies_the_base_project(tmp_path):
    suite_dir = tmp_path / "suites" / "seeded"
    (suite_dir / "base").mkdir(parents=True)
    (suite_dir / "base" / "seed.txt").write_text("from the base\n")
    (suite_dir / "prompts").mkdir()
    (suite_dir / "prompts" / "01.md").write_text("Write add.py.\n")
    (suite_dir / "tests").mkdir()
    (suite_dir / "tests" / "test_add.py").write_text(
        "from add import add\n\ndef test_add():\n    assert add(2, 3) == 5\n")
    suite = harness.load_suite(tmp_path / "suites", "seeded")
    run_dir = harness.run_suite(
        suite, runs_dir=tmp_path / "runs", profile=PROFILE,
        pi_binary=str(FIX / "fake-pi.sh"),
    )
    assert (run_dir / "workspace" / "seed.txt").read_text() == "from the base\n"


def test_missing_pi_is_a_message(tmp_path):
    task = harness.load_suite(SUITES, "add")
    with pytest.raises(SystemExit) as exc:
        harness.run_suite(task, runs_dir=tmp_path / "runs", profile=PROFILE,
                         pi_binary="/nonexistent/pi")
    assert "pi" in str(exc.value)


def _scored(tmp_path, binary):
    run_dir = run(tmp_path, binary)
    return harness.score(run_dir, harness.load_suite(SUITES, "add"))


def test_score_passes_a_working_workspace(tmp_path):
    passed, tail = _scored(tmp_path, "fake-pi.sh")
    assert passed, tail


def test_score_keeps_the_run_and_copies_the_tests(tmp_path):
    run_dir = run(tmp_path, "fake-pi-empty.sh")
    passed, tail = harness.score(run_dir, harness.load_suite(SUITES, "add"))
    assert not passed
    assert (run_dir / "workspace" / "grader_tests" / "test_add.py").exists()
    assert tail


def test_score_fails_a_wrong_solution(tmp_path):
    passed, _ = _scored(tmp_path, "fake-pi-wrong.sh")
    assert not passed


EASY = HERE.parent / "suites" / "easy"


def _task_tests_pass(cwd, tests):
    result = subprocess.run(
        ["uvx", "pytest", "-q", str(tests)], cwd=cwd, capture_output=True,
        text=True, env={**os.environ, "PYTHONPATH": str(cwd)},
        check=False,
    )
    return result.returncode == 0


def _write_trace(run, rows):
    (run / "trace.jsonl").write_text("\n".join(json.dumps(r) for r in rows) + "\n")


def test_report_counts_the_trace(tmp_path):
    run_dir = tmp_path / "r"
    run_dir.mkdir()
    _write_trace(run_dir, [
        {"type": "instance_start", "timestamp": "2026-10-21T00:00:00+00:00"},
        {"type": "provider_request", "request": 1},
        {"type": "tool_call", "toolName": "bash"},
        {"type": "tool_result", "isError": True},
        {"type": "message_end", "timestamp": "2026-10-21T00:00:01+00:00",
         "message": {"role": "assistant",
                     "usage": {"input": 1000, "output": 10},
                     "content": [{"type": "text", "text": "ok"}]}},
        {"type": "provider_request", "request": 2},
        {"type": "message_end", "timestamp": "2026-10-21T00:00:02+00:00",
         "message": {"role": "assistant",
                     "usage": {"input": 1500, "output": 20},
                     "content": [{"type": "text", "text": "done"}]}},
        {"type": "agent_settled", "timestamp": "2026-10-21T00:00:02+00:00"},
    ])
    assert harness.report(run_dir) == {
        "requests": 2, "turns": 2, "tool_calls": 1, "tool_errors": 1,
        "final_reply": "done", "context": 1500, "output_tokens": 30,
        "wall": 2.0, "nudges": 0, "empty_finals": 0,
    }


def test_report_without_text(tmp_path):
    run_dir = tmp_path / "r"
    run_dir.mkdir()
    _write_trace(run_dir, [{"type": "instance_start"}])
    assert harness.report(run_dir) == {
        "requests": 0, "turns": 0, "tool_calls": 0, "tool_errors": 0,
        "final_reply": "", "context": None, "output_tokens": None, "wall": None,
        "nudges": 0, "empty_finals": 0,
    }


def test_report_separates_a_nudge_from_an_empty_final(tmp_path):
    run_dir = tmp_path / "r"
    run_dir.mkdir()
    empty = {"role": "assistant", "stopReason": "stop", "content": []}
    _write_trace(run_dir, [
        {"type": "instance_start"},
        {"type": "provider_request", "request": 1},
        {"type": "message_end", "message": empty},
        {"type": "provider_request", "request": 2},
        {"type": "message_end", "message": {"role": "assistant",
                                            "content": [{"type": "text", "text": "ok"}]}},
        {"type": "provider_request", "request": 3},
        {"type": "message_end", "message": dict(empty, stopReason="length")},
    ])
    report = harness.report(run_dir)
    assert report["nudges"] == 1
    assert report["empty_finals"] == 1


def test_score_details_counts_expected_failures(tmp_path):
    suite_dir = tmp_path / "suites" / "failcheck"
    (suite_dir / "tests").mkdir(parents=True)
    (suite_dir / "tests" / "test_add.py").write_text(
        "from add import add\n\ndef test_add():\n    assert add(2, 3) == 5\n")
    (suite_dir / "expected.json").write_text(
        json.dumps(["grader_tests/test_add.py::test_add"]))
    (suite_dir / "task.md").write_text("Write add.py.\n")
    suite = harness.load_suite(tmp_path / "suites", "failcheck")
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    (workspace / "add.py").write_text("def add(a, b):\n    return 0\n")
    passed, tail, missing, checks_ran = harness.score_workspace_details(workspace, suite)
    assert not passed
    assert checks_ran
    assert missing == ["grader_tests/test_add.py::test_add"]
    assert "test_add" in tail


def test_check_groups_counts_each_module_both_ways(tmp_path):
    suite_dir = tmp_path / "suites" / "twophase"
    (suite_dir / "tests").mkdir(parents=True)
    (suite_dir / "tests" / "test_phase1_home.py").write_text(
        "def test_home():\n    assert True\n")
    (suite_dir / "tests" / "test_phase2_board.py").write_text(
        "def test_board():\n    assert False\n")
    (suite_dir / "expected.json").write_text(json.dumps([
        "grader_tests/test_phase1_home.py::test_home",
        "grader_tests/test_phase2_board.py::test_board",
    ]))
    (suite_dir / "task.md").write_text("Build it.\n")
    suite = harness.load_suite(tmp_path / "suites", "twophase")
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    _passed, _tail, missing, _ran = harness.score_workspace_details(workspace, suite)
    assert missing == ["grader_tests/test_phase2_board.py::test_board"]
    assert harness.check_groups(suite.expected, missing) == {
        "test_phase1_home.py": {"missing": 0, "total": 1},
        "test_phase2_board.py": {"missing": 1, "total": 1},
    }


def _phased_suite(tmp_path):
    suite_dir = tmp_path / "suites" / "phased"
    (suite_dir / "base" / "specs").mkdir(parents=True)
    (suite_dir / "base" / "specs" / "roadmap.md").write_text("all phases, one file\n")
    (suite_dir / "base" / "AGENTS.md").write_text("the phases are in specs/roadmap.md\n")
    (suite_dir / "prompts").mkdir()
    (suite_dir / "prompts" / "01.md").write_text("default prompt\n")
    (suite_dir / "tests").mkdir()
    (suite_dir / "tests" / "test_ok.py").write_text("def test_ok():\n    assert True\n")
    joined = suite_dir / "spec-variants" / "joined" / "prompts"
    joined.mkdir(parents=True)
    (joined / "01.md").write_text("joined prompt\n")
    split = suite_dir / "spec-variants" / "split"
    (split / "prompts").mkdir(parents=True)
    (split / "specs").mkdir()
    (split / "prompts" / "01.md").write_text("split prompt\n")
    (split / "AGENTS.md").write_text("one file per phase in specs/\n")
    (split / "specs" / "phase-1.md").write_text("phase one\n")
    (split / "delete.json").write_text(json.dumps(["specs/roadmap.md"]))
    return harness.load_suite(tmp_path / "suites", "phased")


def _variant_run(tmp_path, suite, specs):
    return harness.run_suite(
        suite, runs_dir=tmp_path / "runs", profile=PROFILE,
        pi_binary=str(FIX / "fake-pi.sh"), specs=specs,
    )


def test_checks_that_never_ran_are_recorded_as_such(tmp_path):
    suite_dir = tmp_path / "suites" / "broken"
    (suite_dir / "tests").mkdir(parents=True)
    (suite_dir / "tests" / "test_board.py").write_text(
        "import models\n\ndef test_board():\n    assert models.complaints\n")
    (suite_dir / "expected.json").write_text(json.dumps([
        "grader_tests/test_board.py::test_board"]))
    (suite_dir / "task.md").write_text("Build it.\n")
    suite = harness.load_suite(tmp_path / "suites", "broken")
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    passed, tail, missing, checks_ran = harness.score_workspace_details(workspace, suite)
    assert not passed
    assert not checks_ran, "a collection error is not the same finding as a failing check"
    assert missing == ["grader_tests/test_board.py::test_board"]
    assert "ModuleNotFoundError" in tail


def test_the_record_says_when_the_checks_never_ran(tmp_path):
    suite_dir = tmp_path / "suites" / "broken"
    (suite_dir / "tests").mkdir(parents=True)
    (suite_dir / "tests" / "test_board.py").write_text(
        "import models\n\ndef test_board():\n    assert models.complaints\n")
    (suite_dir / "expected.json").write_text(json.dumps([
        "grader_tests/test_board.py::test_board"]))
    (suite_dir / "task.md").write_text("Build add.py with add(a, b).\n")
    suite = harness.load_suite(tmp_path / "suites", "broken")
    results = harness._run_sessions(
        suite, runs_dir=tmp_path / "runs", pi_binary=str(FIX / "fake-pi.sh"),
        repeat=1, grade_run=False, deadline=None,
    )
    record = json.loads((results[0][0] / "run.json").read_text())
    assert record["checks_ran"] is False


def test_a_suite_without_a_variant_is_unchanged(tmp_path):
    suite = _phased_suite(tmp_path)
    run_dir = _variant_run(tmp_path, suite, None)
    assert (Path(run_dir) / "prompt.txt").read_text().strip() == "default prompt"
    workspace = Path(run_dir) / "workspace"
    assert (workspace / "specs" / "roadmap.md").is_file()
    assert (workspace / "AGENTS.md").read_text().strip() == (
        "the phases are in specs/roadmap.md")


def test_specs_joined_takes_the_variants_prompts(tmp_path):
    suite = _phased_suite(tmp_path)
    run_dir = _variant_run(tmp_path, suite, "joined")
    assert (Path(run_dir) / "prompt.txt").read_text().strip() == "joined prompt"
    assert (Path(run_dir) / "workspace" / "specs" / "roadmap.md").is_file()


def test_specs_split_overlays_the_project_and_deletes_the_roadmap(tmp_path):
    suite = _phased_suite(tmp_path)
    run_dir = _variant_run(tmp_path, suite, "split")
    workspace = Path(run_dir) / "workspace"
    assert (Path(run_dir) / "prompt.txt").read_text().strip() == "split prompt"
    assert (workspace / "specs" / "phase-1.md").is_file()
    assert not (workspace / "specs" / "roadmap.md").exists()
    assert (workspace / "AGENTS.md").read_text().strip() == (
        "one file per phase in specs/")


def test_unknown_specs_variant_names_the_ones_available(tmp_path):
    suite = _phased_suite(tmp_path)
    with pytest.raises(SystemExit) as error:
        _variant_run(tmp_path, suite, "stepwise")
    assert "joined" in str(error.value) and "split" in str(error.value)


def test_medium_ships_both_spec_variants():
    suite = harness.load_suite(harness.SUITES, "medium")
    joined = harness.load_variant(suite, "joined")
    split = harness.load_variant(suite, "split")
    assert (split / "specs" / "phase-4.md").is_file()
    assert json.loads((split / "delete.json").read_text()) == ["specs/roadmap.md"]
    joined_prompts = sorted((joined / "prompts").glob("*.md"))
    split_prompts = sorted((split / "prompts").glob("*.md"))
    assert len(joined_prompts) == len(split_prompts) == 4
    for index, (left, right) in enumerate(zip(joined_prompts, split_prompts), 1):
        # the arms differ in one thing only: the file the pointer names
        assert left.read_text().replace("specs/roadmap.md", "SPEC") == \
            right.read_text().replace(f"specs/phase-{index}.md", "SPEC")


def test_the_split_keeps_the_roadmaps_phases():
    suite = harness.load_suite(harness.SUITES, "medium")
    roadmap = (suite.root / "base" / "specs" / "roadmap.md").read_text()
    blocks, current = {}, None
    for line in roadmap.splitlines():
        if line.startswith("## Phase"):
            current = line.removeprefix("## ").split(" \u2014 ")[0].lower().replace(" ", "-")
            blocks[current] = [line.removeprefix("## ")]
        elif line.startswith("## "):
            current = None
        elif current is not None and line.strip():
            blocks[current].append(line.strip())
    assert sorted(blocks) == ["phase-1", "phase-2", "phase-3", "phase-4"]
    split = harness.load_variant(suite, "split")
    for name, lines in blocks.items():
        text = (split / "specs" / f"{name}.md").read_text()
        for line in lines:
            assert line in text, f"{name} lost: {line}"


def test_the_thin_briefs_name_the_verification_loop():
    suite = harness.load_suite(harness.SUITES, "medium")
    for arm in ("joined", "split"):
        prompts = sorted((harness.load_variant(suite, arm) / "prompts").glob("*.md"))
        assert len(prompts) == 4
        for prompt in prompts:
            text = " ".join(prompt.read_text().split())
            assert "python -m pytest tests" in text, f"{arm}/{prompt.name} names no test command"
            assert "do not check it by starting a server" in text, (
                f"{arm}/{prompt.name} does not rule out a server as the check")


def test_medium_base_ships_a_phase1_smoke_test():
    suite = harness.load_suite(harness.SUITES, "medium")
    test = suite.root / "base" / "tests" / "test_home.py"
    assert test.is_file(), "the base project ships no test, so its test command has nothing to run"
    text = test.read_text()
    assert "TestClient" in text
    assert "Come in. Sit down." in text


def test_medium_asks_for_the_home_page_in_process():
    suite = harness.load_suite(harness.SUITES, "medium")
    roadmap = (suite.root / "base" / "specs" / "roadmap.md").read_text()
    assert "TestClient" in roadmap, "the roadmap never asks for an in-process check"
    split = (harness.load_variant(suite, "split") / "specs" / "phase-1.md").read_text()
    assert "TestClient" in split


def test_run_sessions_records_the_variant(tmp_path):
    suite = _phased_suite(tmp_path)
    results = harness._run_sessions(
        suite, runs_dir=tmp_path / "runs", pi_binary=str(FIX / "fake-pi.sh"),
        repeat=1, grade_run=False, deadline=None, specs="split",
    )
    record = json.loads((results[0][0] / "run.json").read_text())
    assert record["specs"] == "split"


def test_run_sessions_writes_metrics(tmp_path):
    suite = harness.load_suite(SUITES, "add")
    results = harness._run_sessions(
        suite, runs_dir=tmp_path / "runs", pi_binary=str(FIX / "fake-pi.sh"),
        repeat=1, grade_run=False, deadline=None,
    )
    run_dir = results[0][0]
    record = json.loads((run_dir / "run.json").read_text())
    assert record["suite"] == "add"
    assert record["passed"] is True
    assert record["failed_checks"] == 0
    assert record["missing_checks"] == []
    # the fixture suite declares no expected.json, so there are no groups to report
    assert record["checks_ran"] is True
    assert record["check_groups"] == {}
    assert record["turns"] == 0
    assert record["context"] is None
    assert record["wall"] is None


def test_grade_ignores_the_workspace_venv(tmp_path):
    workspace = _workspace(
        tmp_path, "def fizz(n: int) -> str:\n    return str(n)\n")
    venv = workspace / ".venv"
    venv.mkdir()
    (venv / "bad.py").write_text("def broken():\n    return missing\n")
    grades = {name: ok for name, ok, _ in harness.grade(workspace)}
    assert grades["ruff"] is True


def test_run_suites_orders_easy_medium_hard(tmp_path, capsys):
    for name in ("hard", "easy", "medium"):
        suite = tmp_path / "suites" / name
        (suite / "tests").mkdir(parents=True)
        (suite / "task.md").write_text("Write add.py with add(a, b).\n")
        (suite / "tests" / "test_add.py").write_text(
            "from add import add\n\ndef test_add():\n    assert add(2, 3) == 5\n")
    harness.run_suites(
        ["all"], suites_dir=tmp_path / "suites", runs_dir=tmp_path / "runs",
        pi_binary=str(FIX / "fake-pi.sh"),
    )
    out = capsys.readouterr().out
    assert out.index("easy") < out.index("medium") < out.index("hard")


def test_suite_runs_every_named_task(tmp_path):
    passed, total = harness.run_suites(
        ["all"], suites_dir=SUITES, runs_dir=tmp_path / "runs",
        pi_binary=str(FIX / "fake-pi.sh"),
    )
    assert (passed, total) == (2, 2)


def test_suite_counts_a_failure(tmp_path):
    passed, total = harness.run_suites(
        ["add"], suites_dir=SUITES, runs_dir=tmp_path / "runs",
        pi_binary=str(FIX / "fake-pi-empty.sh"),
    )
    assert (passed, total) == (0, 1)


def test_suite_rejects_an_unknown_name(tmp_path):
    with pytest.raises(SystemExit) as exc:
        harness.run_suites(["nope"], suites_dir=SUITES, runs_dir=tmp_path / "runs")
    assert "nope" in str(exc.value)


def _workspace(tmp_path, source):
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    (workspace / "solution.py").write_text(textwrap.dedent(source))
    return workspace


def _grades(tmp_path, source):
    return {name: ok for name, ok, _ in harness.grade(_workspace(tmp_path, source))}


def test_grade_passes_a_clean_solution(tmp_path):
    assert _grades(tmp_path, "def fizz(n: int) -> str:\n    return str(n)\n") == {
        "ruff": True, "pyrefly": True, "complexipy": True,
    }


def test_grade_fails_ruff_on_an_unused_import(tmp_path):
    workspace = _workspace(
        tmp_path, "import os\n\n\ndef fizz(n: int) -> str:\n    return str(n)\n")
    results = {name: (ok, detail) for name, ok, detail in harness.grade(workspace)}
    assert results["ruff"][0] is False
    assert "F401" in results["ruff"][1], results["ruff"][1]
    assert results["pyrefly"][0] is True
    assert results["complexipy"][0] is True


def test_grade_fails_pyrefly_on_a_type_error(tmp_path):
    grades = _grades(tmp_path, "def f(x: int) -> str:\n    return x\n")
    assert grades["pyrefly"] is False
    assert grades["ruff"] is True


def test_grade_fails_complexipy_above_ten(tmp_path):
    branches = "".join(f"    if x == {i}:\n        return {i}\n" for i in range(12))
    grades = _grades(tmp_path, "def f(x: int) -> int:\n" + branches + "    return -1\n")
    assert grades["complexipy"] is False
    assert grades["ruff"] is True


def test_grade_ignores_a_copied_tests_dir(tmp_path):
    workspace = _workspace(tmp_path, "def fizz(n: int) -> str:\n    return str(n)\n")
    (workspace / "tests").mkdir()
    (workspace / "tests" / "test_x.py").write_text("import pytest\n")
    results = {name: ok for name, ok, _ in harness.grade(workspace)}
    assert results["ruff"] is True


@pytest.mark.parametrize("name", ["easy"])
def test_each_solution_passes_the_graders(tmp_path, name):
    solved = tmp_path / name
    solved.mkdir()
    source = (HERE.parent / "suites" / name / "fixtures" / "known-good"
              if name == "easy"
              else HERE.parent / "suites" / name / "solution")
    shutil.copytree(source, solved, dirs_exist_ok=True)
    results = harness.grade(solved)
    assert all(ok for name, ok, _ in results if name in {"ruff", "complexipy"}), results


def test_a_session_can_be_bounded(tmp_path):
    import time as clock

    task = harness.load_suite(SUITES, "add")
    started = clock.monotonic()
    run_dir = harness.run_suite(
        task, runs_dir=tmp_path / "runs", profile=PROFILE,
        pi_binary=str(FIX / "fake-pi-slow.sh"), deadline=1,
    )
    assert clock.monotonic() - started < 5
    assert (run_dir / "deadline").exists()


def test_runs_default_outside_the_repo():
    import tempfile

    assert str(harness.RUNS).startswith(tempfile.gettempdir())
    assert not str(harness.RUNS).startswith(str(harness.CODE))


def test_a_canary_in_the_trace_marks_the_run(tmp_path):
    suite = harness.Suite(
        name="x", prompts=["p"], tests=tmp_path / "g", start=None,
        canary="CANARY-TOKEN")
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    (run_dir / "trace.jsonl").write_text('{"type":"tool_call","input":"CANARY-TOKEN"}')
    assert harness.grader_touched(run_dir, suite) is True
    (run_dir / "trace.jsonl").write_text('{"type":"tool_call","input":"ls"}')
    assert harness.grader_touched(run_dir, suite) is False


def test_a_missing_expected_test_fails(tmp_path):
    base = harness.load_suite(SUITES, "add")
    suite = harness.Suite(
        name=base.name, prompts=base.prompts, tests=base.tests,
        start=base.start, expected=("tests/test_add.py::test_nope",))
    run_dir = harness.run_suite(
        suite, runs_dir=tmp_path / "runs", profile=PROFILE,
        pi_binary=str(FIX / "fake-pi.sh"))
    passed, tail = harness.score(run_dir, suite)
    assert not passed
    assert "missing expected tests" in tail


def test_qualify_proves_both_directions():
    suite = harness.load_suite(FIX, "qualify")
    ok, results = harness.qualify(suite)
    assert ok
    assert results == {"known-good": True, "known-broken": False}


def test_the_arm_owns_the_facts_knob(tmp_path, monkeypatch):
    task = harness.load_suite(SUITES, "add")
    monkeypatch.setenv("MELLUM_MODE_FACTS", "1")

    def seen(arm):
        run_dir = harness.run_suite(
            task, runs_dir=tmp_path / arm, profile=PROFILE,
            pi_binary=str(FIX / "fake-pi-env.sh"), arm=arm,
        )
        return (run_dir / "workspace" / "env.txt").read_text().strip()

    assert seen("no-facts") == "MELLUM_MODE_FACTS=0"
    assert seen("worker") == "MELLUM_MODE_FACTS="


def test_the_recorder_loads_after_the_worker_extension():
    # Pi runs before_provider_request handlers in extension load order and each
    # may replace the payload, so a recorder placed first sees the messages
    # before the worker appends its facts block.
    argv = harness.pi_argv(
        "pi", PROFILE, Path("rec.mjs"), "llamacpp", "model", "task",
        extension=harness.arm_settings("worker")["extension"],
    )
    assert argv.index(str(harness.arm_settings("worker")["extension"])) < argv.index("rec.mjs")


def _trace(*rows):
    return "".join(json.dumps(dict(traceSchema=1, timestamp="2026-10-24T00:00:0%dZ" % i, **r)) + "\n"
                   for i, r in enumerate(rows))


def test_an_empty_final_at_a_prompt_boundary_is_not_a_nudge(tmp_path):
    # Medium and hard run one Pi process per prompt. An empty turn that ends one
    # prompt is followed by the next prompt's request, which is not a nudge.
    run = tmp_path / "run"
    run.mkdir()
    (run / "trace.jsonl").write_text(_trace(
        {"type": "instance_start"},
        {"type": "provider_request", "request": 1},
        {"type": "message_end", "message": {"role": "assistant", "content": []}},
        {"type": "agent_settled", "aborted": False},
        {"type": "instance_start"},
        {"type": "provider_request", "request": 1},
        {"type": "message_end", "message": {"role": "assistant",
         "content": [{"type": "text", "text": "done"}]}},
        {"type": "agent_settled", "aborted": False},
    ))
    counts = harness.report(run)
    assert counts["nudges"] == 0
    assert counts["empty_finals"] == 1


def test_an_empty_turn_inside_one_prompt_is_a_nudge(tmp_path):
    run = tmp_path / "run"
    run.mkdir()
    (run / "trace.jsonl").write_text(_trace(
        {"type": "instance_start"},
        {"type": "provider_request", "request": 1},
        {"type": "message_end", "message": {"role": "assistant", "content": []}},
        {"type": "provider_request", "request": 2},
        {"type": "message_end", "message": {"role": "assistant",
         "content": [{"type": "text", "text": "done"}]}},
        {"type": "agent_settled", "aborted": False},
    ))
    counts = harness.report(run)
    assert counts["nudges"] == 1
    assert counts["empty_finals"] == 0


def _write(root, rel, text="x\n"):
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def test_layout_report_names_created_and_modified_files_outside_it(tmp_path):
    root = tmp_path / "workspace"
    _write(root, "app.py", "one\n")
    _write(root, "tests/test_home.py", "pass\n")
    pristine = harness.file_hashes(root)
    _write(root, "app.py", "two\n")            # modified, allowed
    _write(root, "templates/home.html")        # created, allowed
    _write(root, "notes.txt")                  # created, outside the layout
    _write(root, "tests/test_extra.py")        # created, allowed by tests/**
    _write(root, ".venv/lib/python3.14/x.py")  # ignored
    _write(root, "app.log")                    # ignored
    layout = {"allow": ["app.py", "templates/**", "tests/**"],
              "ignore": [".venv/**", "*.log"]}
    report = harness.layout_report(root, pristine, layout)
    assert report["modified"] == ["app.py"]
    assert "templates/home.html" in report["created"]
    assert "tests/test_extra.py" in report["created"]
    assert report["out_of_layout"] == ["notes.txt"]


def test_a_clean_workspace_has_nothing_outside_its_layout(tmp_path):
    root = tmp_path / "workspace"
    _write(root, "app.py", "one\n")
    pristine = harness.file_hashes(root)
    _write(root, "app.py", "two\n")
    report = harness.layout_report(root, pristine, {"allow": ["app.py"], "ignore": []})
    assert report["out_of_layout"] == []
    assert report["modified"] == ["app.py"]


def test_loading_a_suite_reads_its_layout(tmp_path):
    suite_dir = tmp_path / "suites" / "demo"
    (suite_dir / "prompts").mkdir(parents=True)
    (suite_dir / "prompts" / "01.md").write_text("do it")
    (suite_dir / "layout.json").write_text(json.dumps({"allow": ["a.py"], "ignore": []}))
    suite = harness.load_suite(tmp_path / "suites", "demo")
    assert suite.layout == {"allow": ["a.py"], "ignore": []}


def test_a_suite_can_run_all_its_prompts_as_one(tmp_path):
    # "One prose brief" against "the same brief as steps" has to be one change,
    # so the flag concatenates the suite's own prompts instead of copying it.
    task = harness.load_suite(SUITES, "steps")
    assert len(task.prompts) > 1
    run_dir = harness.run_suite(
        task, runs_dir=tmp_path / "one", profile=PROFILE,
        pi_binary=str(FIX / "fake-pi-session.sh"), single_prompt=True,
    )
    # The brief carries newlines, so the log is not one line per invocation.
    log = (run_dir / "workspace" / "session-log.txt").read_text()
    invocations = re.findall(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\|", log)
    assert len(invocations) == 1, f"expected one invocation, saw {len(invocations)}"
    for text in task.prompts:
        assert text in log, f"brief lost {text}"


def test_a_record_says_which_machine_and_deadline_it_ran_on(tmp_path):
    # An M1 Pro and an M5 Max produce very different walls; a record that does
    # not name the machine invites the wrong comparison.
    task = harness.load_suite(SUITES, "add")
    harness._run_sessions(task, runs_dir=tmp_path / "runs",
                          pi_binary=str(FIX / "fake-pi.sh"), repeat=1,
                          grade_run=False, deadline=600, arm="worker")
    record = json.loads((next((tmp_path / "runs").iterdir()) / "run.json").read_text())
    assert record["deadline"] == 600
    assert record["machine"] == harness.machine_label()
    assert record["machine"], "machine label is empty"


def test_a_run_sweeps_the_processes_it_leaves_behind():
    # A worker that backgrounds `python app.py &` and then settles leaves a
    # server holding a port. The sweep finds it and ends it, and the run record
    # names what it found.
    child = subprocess.Popen(["sleep", "30"], start_new_session=True)
    try:
        time.sleep(0.2)
        found = harness.sweep_group(child.pid)
        assert any("sleep 30" in command for _, command in found), found
        child.wait(timeout=5)  # killed by the sweep, not by us
    finally:
        if child.poll() is None:
            child.kill()


def test_a_group_with_nothing_left_reports_nothing(tmp_path):
    child = subprocess.Popen(["sh", "-c", "true"], start_new_session=True)
    child.wait(timeout=5)
    assert harness.sweep_group(child.pid) == []
