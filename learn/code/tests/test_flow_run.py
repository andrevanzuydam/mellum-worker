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
    gate = tmp_path / ".mellum_gate"
    gate.mkdir()
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
    flow_run.restore_gate(tmp_path)  # no .mellum_gate — must not raise
