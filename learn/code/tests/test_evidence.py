import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import evidence


def _run(root, name, **fields):
    path = root / name
    path.mkdir(parents=True)
    (path / "run.json").write_text(json.dumps(fields))


def test_table_has_metrics_and_means(tmp_path):
    _run(tmp_path, "a", suite="easy", arm="worker", passed=True,
         failed_checks=0, turns=2, tool_errors=1, context=100,
         wall=4.0, output_tokens=10)
    _run(tmp_path, "b", suite="easy", arm="worker", passed=False,
         failed_checks=2, turns=4, tool_errors=3, context=300,
         wall=8.0, output_tokens=30)
    table = evidence.render(tmp_path)
    assert "| Suite | Arm | Passes | Turns | Failed checks | Tool errors | Context | Wall | Output tokens |" in table
    assert "| easy | worker | 1/2 | 3.0 | 1.0 | 2.0 | 200.0 | 6.0 | 20.0 |" in table


def test_table_carries_the_nudge_fires(tmp_path):
    _run(tmp_path, "a", suite="easy", arm="worker", passed=True,
         failed_checks=0, turns=2, tool_errors=0, context=100,
         wall=4.0, output_tokens=10, nudges=1)
    _run(tmp_path, "b", suite="easy", arm="worker", passed=True,
         failed_checks=0, turns=4, tool_errors=0, context=300,
         wall=8.0, output_tokens=30, nudges=3)
    table = evidence.render(tmp_path)
    assert "| Passes | Turns | Failed checks | Tool errors | Context | Wall | Output tokens | Nudges |" in table
    assert "| easy | worker | 2/2 | 3.0 | 0.0 | 0.0 | 200.0 | 6.0 | 20.0 | 2.0 |" in table


def test_missing_metric_is_an_em_dash(tmp_path):
    _run(tmp_path, "a", suite="easy", arm="bare", passed=True,
         failed_checks=0, turns=1, tool_errors=0, context=None,
         wall=None, output_tokens=None)
    assert "—" in evidence.render(tmp_path)


def test_filters(tmp_path):
    _run(tmp_path, "a", suite="easy", arm="worker", passed=True)
    _run(tmp_path, "b", suite="hard", arm="worker", passed=True)
    table = evidence.render(tmp_path, suite="hard")
    assert "hard | worker" in table
    assert "easy | worker" not in table
