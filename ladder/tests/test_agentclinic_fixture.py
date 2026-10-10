"""Self-check of the AgentClinic fixtures behind rungs 6-9.

For each phase N the start state must fail the phase's hidden tests, and the
next state (the start of phase N+1, or the finished project) must pass the
hidden tests of phases 1..N together with the workspace's own tests. A failed
``uv sync --offline`` fails loudly here instead of scoring every run as FAIL.
"""

import shutil
import subprocess

import pytest

from ladder.rungs import FIXTURES, copy_fixture

HIDDEN = FIXTURES / "agentclinic-hidden"
NEXT_STATE = {1: "agentclinic-p2", 2: "agentclinic-p3", 3: "agentclinic-p4", 4: "agentclinic-done"}


def sync(ws):
    done = subprocess.run(
        ["uv", "sync", "--offline"], cwd=ws, capture_output=True, text=True, check=False
    )
    assert done.returncode == 0, f"uv sync --offline failed:\n{done.stderr}"


def run_pytest(ws, *args):
    return subprocess.run(
        ["uv", "run", "--offline", "python", "-m", "pytest", "-q", *args],
        cwd=ws,
        capture_output=True,
        text=True,
        check=False,
    )


def hidden_files(ws, upto):
    names = []
    for k in range(1, upto + 1):
        shutil.copy(HIDDEN / f"_hidden_p{k}.py", ws / f"_hidden_p{k}.py")
        names.append(f"_hidden_p{k}.py")
    return names


@pytest.mark.slow
@pytest.mark.parametrize("n", [1, 2, 3, 4])
def test_start_fails_hidden_tests(n, tmp_path):
    ws = copy_fixture(f"agentclinic-p{n}", tmp_path / "ws")
    sync(ws)
    shutil.copy(HIDDEN / f"_hidden_p{n}.py", ws / f"_hidden_p{n}.py")
    assert run_pytest(ws, f"_hidden_p{n}.py").returncode != 0


@pytest.mark.slow
@pytest.mark.parametrize("n", [1, 2, 3, 4])
def test_next_state_passes_hidden_and_own_tests(n, tmp_path):
    ws = copy_fixture(NEXT_STATE[n], tmp_path / "ws")
    sync(ws)
    names = hidden_files(ws, n)
    own = run_pytest(ws, "tests")
    assert own.returncode == 0, own.stdout + own.stderr
    hidden = run_pytest(ws, *names)
    assert hidden.returncode == 0, hidden.stdout + hidden.stderr


@pytest.mark.slow
def test_done_state_passes_all_hidden_tests_together(tmp_path):
    ws = copy_fixture("agentclinic-done", tmp_path / "ws")
    sync(ws)
    names = hidden_files(ws, 4)
    result = run_pytest(ws, "tests", *names)
    assert result.returncode == 0, result.stdout + result.stderr
