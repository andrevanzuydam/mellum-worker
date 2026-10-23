import signal
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import flow_run


def test_reap_group_swallows_eperm_and_no_such_process(monkeypatch):
    # EPERM crashed a whole best-of-N run: the pid was recycled into a group we do not own.
    for exc in (PermissionError(1, "Operation not permitted"), ProcessLookupError()):
        def boom(pid, sig, _e=exc):
            raise _e
        monkeypatch.setattr(flow_run.os, "killpg", boom)
        flow_run.reap_group(12345)  # must not raise


def test_reap_group_signals_the_group_on_the_happy_path(monkeypatch):
    calls = []
    monkeypatch.setattr(flow_run.os, "killpg", lambda pid, sig: calls.append((pid, sig)))
    flow_run.reap_group(999)
    assert calls == [(999, signal.SIGKILL)]


def test_restore_gate_materialises_every_phase_and_clears_stale(tmp_path):
    gate = tmp_path / "plan" / "gate"
    gate.mkdir(parents=True)
    tests = tmp_path / "tests"
    tests.mkdir()
    (gate / "phase_1.py").write_text("def test_p1():\n    assert 1\n")
    (gate / "phase_2.py").write_text("def test_p2():\n    assert 2\n")
    (tests / "test_gate_phase_9.py").write_text("def test_stale():\n    assert 0\n")  # dropped phase
    (tests / "test_coder.py").write_text("def test_keep():\n    assert 1\n")  # coder's own, must stay

    flow_run.restore_gate(tmp_path)

    got = sorted(p.name for p in tests.iterdir())
    assert got == ["test_coder.py", "test_gate_phase_1.py", "test_gate_phase_2.py"]
    assert "test_p1" in (tests / "test_gate_phase_1.py").read_text()


def test_restore_gate_is_a_noop_without_a_gate_dir(tmp_path):
    flow_run.restore_gate(tmp_path)  # no plan/gate — must not raise


def _freeze(ws, phase, text):
    (ws / "plan" / "gate").mkdir(parents=True, exist_ok=True)
    (ws / "plan" / "gate" / f"phase_{phase}.py").write_text(text)


def test_phase_gate_ok_requires_a_real_frozen_test_for_this_phase(tmp_path):
    # the bug: a fork with no phase-N test inherits the earlier gate and "passes" trivially.
    assert flow_run.phase_gate_ok(tmp_path, 3) is False          # no gate dir / file at all
    _freeze(tmp_path, 1, "def test_home():\n    assert 1\n")
    assert flow_run.phase_gate_ok(tmp_path, 3) is False          # phase 1 frozen, but not phase 3
    _freeze(tmp_path, 3, "def test_add():\n    assert 1\n")
    assert flow_run.phase_gate_ok(tmp_path, 3) is True           # phase 3 now has a real test


def test_phase_gate_ok_rejects_html_and_testless_files(tmp_path):
    _freeze(tmp_path, 3, "templates/complaints.html\n{% extends 'base.html' %}\n<div>hi</div>\n")
    assert flow_run.phase_gate_ok(tmp_path, 3) is False          # an HTML blob does not compile
    _freeze(tmp_path, 3, "import pytest\nX = 1  # no test functions\n")
    assert flow_run.phase_gate_ok(tmp_path, 3) is False          # compiles but defines no test
