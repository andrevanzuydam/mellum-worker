import signal
import sys
from pathlib import Path

import pytest

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


def test_seeded_done_lists_the_phases_before_start(tmp_path):
    # resuming at phase N treats phases 1..N-1 as already built — their titles seed `done` so the
    # forward-context message lists them as implemented and passing.
    titles = ["Home", "Board", "Add", "Resolve", "Archive"]
    assert flow_run.seeded_done(titles, 1) == []
    assert flow_run.seeded_done(titles, 5) == ["Home", "Board", "Add", "Resolve"]
    assert flow_run.seeded_done(titles, 99) == titles  # clamped by the slice


def _mk_seed(seed: Path, gates: range):
    (seed / "plan" / "gate").mkdir(parents=True)
    (seed / "templates").mkdir()
    (seed / ".venv" / "bin").mkdir(parents=True)
    (seed / "app.py").write_text("app = 1\n")
    (seed / "models.py").write_text("complaints = []\n")
    (seed / "data.db").write_bytes(b"\x00seed")
    (seed / ".venv" / "bin" / "python").write_text("#!/stale/path\n")  # must NOT be copied
    (seed / "trace-p1-0.jsonl").write_text("{}\n")  # trace must NOT be copied
    for n in gates:
        (seed / "plan" / "gate" / f"phase_{n}.py").write_text(f"def test_p{n}():\n    assert 1\n")


def test_seed_from_bundle_copies_app_and_gates_but_not_venv_or_traces(tmp_path):
    seed = tmp_path / "seed"
    _mk_seed(seed, range(1, 5))  # phases 1-4 frozen
    ws = tmp_path / "ws"
    ws.mkdir()
    flow_run.seed_from_bundle(seed, ws, 5)  # resume at phase 5
    assert (ws / "app.py").read_text() == "app = 1\n"
    assert (ws / "models.py").is_file() and (ws / "data.db").is_file()
    assert (ws / "plan" / "gate" / "phase_1.py").is_file()
    assert (ws / "plan" / "gate" / "phase_4.py").is_file()
    assert not (ws / ".venv").exists()          # stale venv excluded
    assert not (ws / "trace-p1-0.jsonl").exists()  # traces excluded


def test_seed_from_bundle_requires_every_earlier_gate(tmp_path):
    seed = tmp_path / "seed"
    _mk_seed(seed, range(1, 3))  # only phases 1-2 frozen
    ws = tmp_path / "ws"
    ws.mkdir()
    with pytest.raises(FileNotFoundError, match=r"phase\(s\) \[3, 4\]"):
        flow_run.seed_from_bundle(seed, ws, 5)  # needs 1-4, 3 and 4 missing


def test_seed_from_bundle_missing_seed_dir_raises(tmp_path):
    with pytest.raises(FileNotFoundError, match="not found"):
        flow_run.seed_from_bundle(tmp_path / "nope", tmp_path / "ws", 2)


def test_phase_gate_ok_rejects_html_and_testless_files(tmp_path):
    _freeze(tmp_path, 3, "templates/complaints.html\n{% extends 'base.html' %}\n<div>hi</div>\n")
    assert flow_run.phase_gate_ok(tmp_path, 3) is False          # an HTML blob does not compile
    _freeze(tmp_path, 3, "import pytest\nX = 1  # no test functions\n")
    assert flow_run.phase_gate_ok(tmp_path, 3) is False          # compiles but defines no test


def test_gate_files_selects_only_the_frozen_gate_not_the_coders_scratch_tests(tmp_path):
    # hard phase 4: the coder's own test_app.py order test was brittle (list-equality vs shared
    # in-memory state) and failed a CORRECT, gate-passing build. The phase is judged on the FROZEN
    # gate — the definition of DONE — never on the coder's scratch tests.
    tests = tmp_path / "tests"
    tests.mkdir()
    (tests / "test_gate_phase_1.py").write_text("def test_g1():\n    assert 1\n")
    (tests / "test_gate_phase_2.py").write_text("def test_g2():\n    assert 1\n")
    (tests / "test_app.py").write_text("def test_coder():\n    assert 1\n")  # coder's own — excluded
    (tests / "conftest.py").write_text("")  # not a gate file
    got = sorted(p.name for p in flow_run.gate_files(tmp_path))
    assert got == ["test_gate_phase_1.py", "test_gate_phase_2.py"]


def test_gate_files_is_empty_when_no_cumulative_gate_was_frozen(tmp_path):
    # the single-file easy gate freezes no plan/gate/phase_*.py, so there are no test_gate_phase_*
    # files; callers fall back to running the whole suite in that case.
    (tmp_path / "tests").mkdir()
    (tmp_path / "tests" / "test_home.py").write_text("def test_h():\n    assert 1\n")
    assert flow_run.gate_files(tmp_path) == []
