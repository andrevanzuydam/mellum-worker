import subprocess

from ladder.pi_profile import REPO_ROOT
from ladder.sandbox import make_sandbox


def test_sandbox_is_a_git_committed_copy_outside_the_repo(tmp_path):
    ws = make_sandbox(1, tmp_path)
    assert ws.is_relative_to(tmp_path)
    assert (ws / "calculator.js").exists() and not (ws / ".venv").exists()
    log = subprocess.run(
        ["git", "log", "--oneline"], cwd=ws, capture_output=True, text=True, check=False
    ).stdout
    assert "baseline" in log


def test_sandbox_carries_the_rendered_worker_definition_from_this_checkout(tmp_path):
    ws = make_sandbox(1, tmp_path)
    agent = ws / ".pi" / "agents" / "mellum-worker.md"
    assert agent.is_file() and str(REPO_ROOT) in agent.read_text()
    assert not (ws / ".pi" / "mellum").exists()
