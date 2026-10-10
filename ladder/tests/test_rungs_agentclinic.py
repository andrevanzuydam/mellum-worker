"""Rungs 6-9 (AgentClinic phases): registry entries, write-list scoring and the hidden-test check.

The scoring tests need a synced workspace (``uv sync --offline``), so they are
marked slow; the registry and write-list tests are pure.
"""

import shutil
import subprocess

import pytest

from ladder.run_ladder import prepare_workspace
from ladder.rungs import (
    FIXTURES,
    RUNGS,
    check_agentclinic,
    copy_fixture,
    outside_write_list,
)

ALLOWED = ("app.py", "models.py", "templates/", "tests/")
NEXT_STATE = {
    1: "agentclinic-p2",
    2: "agentclinic-p3",
    3: "agentclinic-p4",
    4: "agentclinic-done",
}
HIDDEN = FIXTURES / "agentclinic-hidden"


def git(ws, *args):
    return subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@localhost", *args],
        cwd=ws,
        capture_output=True,
        text=True,
        check=True,
    )


def baseline_repo(path):
    path.mkdir()
    (path / "pyproject.toml").write_text("[project]\nname='x'\n")
    (path / ".gitignore").write_text(".venv/\n")
    git(path, "init", "-q")
    git(path, "add", "-A")
    git(path, "commit", "-qm", "baseline")
    return path


def write(path, text="x\n"):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def test_rungs_6_to_9_are_the_agentclinic_phases():
    assert RUNGS[6].sentence == "Implement specs/phase-1-home.md"
    assert RUNGS[7].sentence == "Implement specs/phase-2-board.md"
    assert RUNGS[8].sentence == "Implement specs/phase-3-add.md"
    assert RUNGS[9].sentence == "Implement specs/phase-4-resolve-reopen.md"
    assert [RUNGS[n].fixture for n in (6, 7, 8, 9)] == [
        f"agentclinic-p{k}" for k in (1, 2, 3, 4)
    ]
    for n in (6, 7, 8, 9):
        assert RUNGS[n].number == n
        assert RUNGS[n].test_cmd == [
            "uv",
            "run",
            "--offline",
            "python",
            "-m",
            "pytest",
            "tests",
            "-q",
        ]


def test_outside_write_list_allows_the_write_list_and_reports_the_rest(tmp_path):
    ws = baseline_repo(tmp_path / "ws")
    write(ws / "app.py")
    write(ws / "templates" / "x.html")
    write(ws / "tests" / "test_y.py")
    write(ws / ".venv" / "lib" / "site.py")
    assert outside_write_list(ws, ALLOWED) == []
    write(ws / "pytest.ini")
    write(ws / "__init__.py")
    write(ws / "pyproject.toml", "[project]\nname='changed'\n")
    assert outside_write_list(ws, ALLOWED) == [
        "__init__.py",
        "pyproject.toml",
        "pytest.ini",
    ]


def test_outside_write_list_looks_inside_new_directories(tmp_path):
    ws = baseline_repo(tmp_path / "ws")
    write(ws / "static" / "site.css")
    write(ws / "templates" / "deep" / "y.html")
    assert outside_write_list(ws, ALLOWED) == ["static/site.css"]


def test_outside_write_list_matches_directories_by_prefix_not_by_name(tmp_path):
    ws = baseline_repo(tmp_path / "ws")
    write(ws / "templates_old" / "x.html")
    write(ws / "app.py.bak")
    assert outside_write_list(ws, ALLOWED) == ["app.py.bak", "templates_old/x.html"]


def overlay(next_fixture, ws):
    """Lay the next state's write-list files over a phase-start workspace, as a finished run would."""
    src = FIXTURES / next_fixture
    for entry in ALLOWED:
        path = src / entry
        if path.is_dir():
            shutil.copytree(
                path,
                ws / entry,
                ignore=shutil.ignore_patterns("__pycache__", ".pytest_cache"),
                dirs_exist_ok=True,
            )
        elif path.exists():
            shutil.copy(path, ws / entry)


@pytest.mark.slow
@pytest.mark.parametrize("n", [1, 2, 3, 4])
def test_check_passes_on_the_next_state(n, tmp_path):
    rung = RUNGS[5 + n]
    ws = prepare_workspace(rung, tmp_path)
    overlay(NEXT_STATE[n], ws)
    result = check_agentclinic(n)(ws, FIXTURES / rung.fixture)
    assert result.details["outside_write_list"] == []
    assert result.details["facts_cmd_pass"] is True
    assert result.details["hidden_pass"] is True
    assert result.details["hidden_collision"] == []
    assert result.tests_unchanged is True
    assert result.passed is True


@pytest.mark.slow
@pytest.mark.parametrize("n", [1, 2, 3, 4])
def test_check_fails_on_the_unchanged_start_state(n, tmp_path):
    rung = RUNGS[5 + n]
    ws = prepare_workspace(rung, tmp_path)
    result = check_agentclinic(n)(ws, FIXTURES / rung.fixture)
    assert result.details["hidden_pass"] is False
    assert result.details["outside_write_list"] == []
    assert result.passed is False


@pytest.mark.slow
def test_check_fails_and_names_a_file_outside_the_write_list(tmp_path):
    rung = RUNGS[6]
    ws = prepare_workspace(rung, tmp_path)
    overlay(NEXT_STATE[1], ws)
    write(ws / "pytest.ini", "[pytest]\n")
    result = check_agentclinic(1)(ws, FIXTURES / rung.fixture)
    assert result.details["hidden_pass"] is True
    assert result.details["outside_write_list"] == ["pytest.ini"]
    assert result.passed is False


@pytest.mark.slow
def test_check_fails_when_an_existing_test_file_changed(tmp_path):
    rung = RUNGS[7]
    ws = prepare_workspace(rung, tmp_path)
    overlay(NEXT_STATE[2], ws)
    with (ws / "tests" / "test_app.py").open("a") as stream:
        stream.write("\n# weakened\n")
    result = check_agentclinic(2)(ws, FIXTURES / rung.fixture)
    assert result.tests_unchanged is False
    assert result.passed is False


@pytest.mark.slow
def test_check_reports_a_hidden_file_already_in_the_workspace(tmp_path):
    rung = RUNGS[6]
    ws = prepare_workspace(rung, tmp_path)
    overlay(NEXT_STATE[1], ws)
    write(ws / "_hidden_p1.py", "def test_always():\n    assert True\n")
    result = check_agentclinic(1)(ws, FIXTURES / rung.fixture)
    assert result.details["hidden_collision"] == ["_hidden_p1.py"]
    assert "_hidden_p1.py" in result.details["outside_write_list"]
    assert result.passed is False
    # The scorer's own copy replaced it: the collision cannot make hidden tests pass.
    assert (ws / "_hidden_p1.py").read_bytes() == (
        HIDDEN / "_hidden_p1.py"
    ).read_bytes()


def test_copy_fixture_is_still_available_for_agentclinic(tmp_path):
    ws = copy_fixture("agentclinic-p1", tmp_path / "ws")
    assert (ws / "AGENTS.md").exists()
