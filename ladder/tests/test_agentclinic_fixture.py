"""Self-check of the AgentClinic fixtures behind rungs 6-9.

For each phase N the start state must fail the phase's hidden tests. That the
next state passes the hidden tests of phases 1..N with its own tests is
``test_rungs_agentclinic.py::test_check_passes_on_the_next_state``, through the
scorer itself. A failed ``uv sync --offline`` fails loudly here instead of
scoring every run as FAIL.
"""

import shutil
import subprocess

import pytest

from ladder.rungs import FIXTURES, copy_fixture

HIDDEN = FIXTURES / "agentclinic-hidden"


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


@pytest.mark.slow
@pytest.mark.parametrize("n", [1, 2, 3, 4])
def test_start_fails_hidden_tests(n, tmp_path):
    ws = copy_fixture(f"agentclinic-p{n}", tmp_path / "ws")
    sync(ws)
    shutil.copy(HIDDEN / f"_hidden_p{n}.py", ws / f"_hidden_p{n}.py")
    assert run_pytest(ws, f"_hidden_p{n}.py").returncode != 0


