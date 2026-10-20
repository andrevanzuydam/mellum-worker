import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import harness  # noqa: E402

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
