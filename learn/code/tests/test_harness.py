import json
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
TASKS = FIX / "tasks"
PROFILE = HERE.parent / "profile"


def run(tmp_path, binary="fake-pi.sh", task="add"):
    return harness.run_task(
        harness.load_task(TASKS, task),
        runs_dir=tmp_path / "runs", profile=PROFILE,
        pi_binary=str(FIX / binary),
    )


def test_load_task_reads_prompt_and_tests():
    task = harness.load_task(TASKS, "add")
    assert "add(a, b)" in task.prompt
    assert (task.tests / "test_add.py").exists()


def test_pi_argv_isolates_the_child():
    task = harness.load_task(TASKS, "add")
    argv = harness.pi_argv("pi", PROFILE, Path("rec.mjs"), "llamacpp", "model-x",
                           task.prompt)
    for flag in ("-p", "--no-session", "--no-approve", "--no-context-files",
                 "--no-extensions", "--no-skills"):
        assert flag in argv
    assert argv[argv.index("-e") + 1].endswith("rec.mjs")
    assert argv[argv.index("--provider") + 1] == "llamacpp"
    assert argv[-1] == task.prompt


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


def test_missing_pi_is_a_message(tmp_path):
    task = harness.load_task(TASKS, "add")
    with pytest.raises(SystemExit) as exc:
        harness.run_task(task, runs_dir=tmp_path / "runs", profile=PROFILE,
                         pi_binary="/nonexistent/pi")
    assert "pi" in str(exc.value)


def _scored(tmp_path, binary):
    run_dir = run(tmp_path, binary)
    return harness.score(run_dir, harness.load_task(TASKS, "add"))


def test_score_passes_a_working_workspace(tmp_path):
    passed, tail = _scored(tmp_path, "fake-pi.sh")
    assert passed, tail


def test_score_keeps_the_run_and_copies_the_tests(tmp_path):
    run_dir = run(tmp_path, "fake-pi-empty.sh")
    passed, tail = harness.score(run_dir, harness.load_task(TASKS, "add"))
    assert not passed
    assert (run_dir / "workspace" / "tests" / "test_add.py").exists()
    assert tail


def test_score_fails_a_wrong_solution(tmp_path):
    passed, _ = _scored(tmp_path, "fake-pi-wrong.sh")
    assert not passed


EASY = HERE.parent / "tasks" / "easy"


def _task_tests_pass(cwd, tests):
    result = subprocess.run(
        ["uvx", "pytest", "-q", str(tests)], cwd=cwd, capture_output=True,
        text=True, env={**os.environ, "PYTHONPATH": str(cwd)},
        check=False,
    )
    return result.returncode == 0


def test_the_easy_task_can_fail_and_pass(tmp_path):
    empty = tmp_path / "empty"
    empty.mkdir()
    assert not _task_tests_pass(empty, EASY / "tests")
    solved = tmp_path / "solved"
    solved.mkdir()
    shutil.copytree(EASY / "solution", solved, dirs_exist_ok=True)
    assert _task_tests_pass(solved, EASY / "tests")


def _write_trace(run, rows):
    (run / "trace.jsonl").write_text("\n".join(json.dumps(r) for r in rows) + "\n")


def test_report_counts_the_trace(tmp_path):
    run_dir = tmp_path / "r"
    run_dir.mkdir()
    _write_trace(run_dir, [
        {"type": "instance_start"},
        {"type": "provider_request", "request": 1},
        {"type": "tool_call", "toolName": "bash"},
        {"type": "tool_result", "isError": True},
        {"type": "message_end",
         "message": {"role": "assistant",
                     "content": [{"type": "text", "text": "ok"}]}},
        {"type": "agent_settled"},
    ])
    assert harness.report(run_dir) == {
        "requests": 1, "tool_calls": 1, "tool_errors": 1, "final_reply": "ok",
    }


def test_report_without_text(tmp_path):
    run_dir = tmp_path / "r"
    run_dir.mkdir()
    _write_trace(run_dir, [{"type": "instance_start"}])
    assert harness.report(run_dir) == {
        "requests": 0, "tool_calls": 0, "tool_errors": 0, "final_reply": "",
    }


def test_suite_runs_every_named_task(tmp_path):
    passed, total = harness.suite(
        ["all"], tasks_dir=TASKS, runs_dir=tmp_path / "runs",
        pi_binary=str(FIX / "fake-pi.sh"),
    )
    assert (passed, total) == (2, 2)


def test_suite_counts_a_failure(tmp_path):
    passed, total = harness.suite(
        ["add"], tasks_dir=TASKS, runs_dir=tmp_path / "runs",
        pi_binary=str(FIX / "fake-pi-empty.sh"),
    )
    assert (passed, total) == (0, 1)


def test_suite_rejects_an_unknown_name(tmp_path):
    with pytest.raises(SystemExit) as exc:
        harness.suite(["nope"], tasks_dir=TASKS, runs_dir=tmp_path / "runs")
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


@pytest.mark.parametrize("name", ["medium", "hard"])
def test_each_task_can_fail_and_pass(tmp_path, name):
    task_dir = HERE.parent / "tasks" / name
    empty = tmp_path / f"{name}-empty"
    empty.mkdir()
    assert not _task_tests_pass(empty, task_dir / "tests")
    solved = tmp_path / f"{name}-solved"
    solved.mkdir()
    shutil.copytree(task_dir / "solution", solved, dirs_exist_ok=True)
    assert _task_tests_pass(solved, task_dir / "tests")


@pytest.mark.parametrize("name", ["easy", "medium", "hard"])
def test_each_solution_passes_the_graders(tmp_path, name):
    solved = tmp_path / name
    solved.mkdir()
    shutil.copytree(HERE.parent / "tasks" / name / "solution", solved,
                    dirs_exist_ok=True)
    results = harness.grade(solved)
    assert all(ok for _, ok, _ in results), results
