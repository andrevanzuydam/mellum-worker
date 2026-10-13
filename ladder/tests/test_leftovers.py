"""Processes a run leaves behind in its workspace are found and stopped."""

import subprocess
import sys
import time
from pathlib import Path

from ladder.leftovers import parse_lsof_cwds, processes_under, stop_leftovers


def test_parse_lsof_cwds_pairs_each_pid_with_its_cwd():
    out = "p101\nfcwd\nn/tmp/ws/rung6\np202\nfcwd\nn/Users/me\np303\nfcwd\n"
    assert parse_lsof_cwds(out) == {101: "/tmp/ws/rung6", 202: "/Users/me"}


def test_processes_under_matches_the_workspace_and_its_subdirectories_only(tmp_path):
    ws = tmp_path / "rung6"
    cwds = {
        1: str(ws),
        2: str(ws / "templates"),
        3: str(tmp_path / "rung6-other"),
        4: str(tmp_path),
    }
    assert processes_under(ws, cwds) == [1, 2]


def test_stop_leftovers_kills_a_process_still_running_in_the_workspace(tmp_path):
    ws = tmp_path / "rung6"
    ws.mkdir()
    proc = subprocess.Popen(
        [sys.executable, "-c", "import time; time.sleep(60)"],
        cwd=ws,
        start_new_session=True,
    )
    try:
        time.sleep(0.3)
        stopped = stop_leftovers(ws, grace=2.0)
        assert proc.pid in [p["pid"] for p in stopped]
        assert proc.wait(timeout=5) is not None
    finally:
        if proc.poll() is None:
            proc.kill()


def test_stop_leftovers_with_nothing_left_returns_empty(tmp_path):
    ws = tmp_path / "rung7"
    ws.mkdir()
    assert stop_leftovers(ws, grace=0.5) == []


def test_stop_leftovers_never_touches_its_own_process(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert stop_leftovers(Path(tmp_path), grace=0.5) == []
