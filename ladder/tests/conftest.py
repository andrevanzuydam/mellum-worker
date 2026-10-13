"""Make the repository root importable so tests can import ``ladder``."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest


@pytest.fixture(autouse=True)
def _no_leftover_sweep(monkeypatch):
    """Runner tests fake subprocess.run and count its calls; keep the post-run lsof sweep
    out of them. test_leftovers.py calls ladder.leftovers directly, and a test can
    patch run_ladder.stop_leftovers itself."""
    from ladder import run_ladder

    monkeypatch.setattr(run_ladder, "stop_leftovers", lambda ws, **kw: [])
