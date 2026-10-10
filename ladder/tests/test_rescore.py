import json
import shutil
from pathlib import Path

from ladder.rescore import RESCORE_RULE, main, rescore_dir, rescore_existing_tests
from ladder.rungs import FIXTURES, RUNGS


def test_rescore_recomputes_score_from_trace_and_baseline(tmp_path):
    run = tmp_path / "rung1-x-r1"
    run.mkdir()
    (run / "trace.jsonl").write_text(
        json.dumps(
            {
                "type": "tool_call",
                "toolName": "write",
                "input": {"path": "a.py", "content": "x\n"},
            }
        )
        + "\n"
    )
    (run / "run.json").write_text(
        json.dumps({"score": {"stale": True}, "baseline_lines": {"a.py": 30}})
    )
    changed = rescore_dir(tmp_path)
    assert changed == 1
    assert json.loads((run / "run.json").read_text())["score"]["write_shrink"] == 1


def test_rescore_backfills_thinking_reentries_from_stdout(tmp_path):
    run = tmp_path / "rung1-x-r1"
    run.mkdir()
    (run / "trace.jsonl").write_text("")
    (run / "stdout.txt").write_text(
        '{"type":"message_end","message":{"role":"assistant","stopReason":"stop","content":'
        '[{"type":"thinking","thinking":"a"},{"type":"text","text":"x"},{"type":"thinking","thinking":"b"}]}}\n'
    )
    (run / "run.json").write_text(
        json.dumps(
            {
                "score": {},
                "baseline_lines": {},
                "check": {"passed": True, "tests_unchanged": True},
                "stop_reason": "stop",
                "final_text_chars": 1,
                "rung": 1,
                "repeat": 1,
                "profile": "p",
                "mode": "direct",
                "guards": False,
                "deadline_hit": False,
                "wall_seconds_untrusted": 1,
            }
        )
    )
    rescore_dir(tmp_path)
    assert json.loads((run / "run.json").read_text())["thinking_reentries"] == 1


# Rule 3 rescore for the AgentClinic rungs (6-9): only tests_unchanged is recomputed.

GOOD = {
    "facts_cmd_pass": True,
    "hidden_pass": True,
    "outside_write_list": [],
    "hidden_collision": [],
}


def make_run(
    phase,
    name,
    rung,
    *,
    details=GOOD,
    passed=False,
    tests_unchanged=False,
    workspace=True,
    append=None,
):
    run = phase / name
    run.mkdir(parents=True)
    ws = phase.parent / f"ws-{name}"
    if workspace:
        src = FIXTURES / RUNGS[rung].fixture / "tests"
        shutil.copytree(src, ws / "tests") if src.exists() else ws.mkdir(parents=True)
        if append:
            with (ws / "tests" / "test_app.py").open("a") as stream:
                stream.write(append)
    record = {
        "rung": rung,
        "workspace": str(ws),
        "check": {
            "passed": passed,
            "tests_unchanged": tests_unchanged,
            "details": details,
        },
    }
    (run / "run.json").write_text(json.dumps(record))
    return run


def rescored(run):
    return json.loads((run / "run.json").read_text())


def test_rescore_existing_tests_passes_a_run_that_only_added_a_test(tmp_path):
    phase = tmp_path / "phase"
    run = make_run(
        phase, "rung7-r1", 7, append="\n\ndef test_extra():\n    assert True\n"
    )
    results = rescore_existing_tests(phase)
    data = rescored(run)
    assert data["check_rescored"] == {
        "passed": True,
        "tests_unchanged": True,
        "rule": RESCORE_RULE,
    }
    assert RESCORE_RULE == "existing-tests-kept"
    assert data["check"]["passed"] is False  # the original record stays as recorded
    assert data["check"]["tests_unchanged"] is False
    assert results == {"rung7-r1": "rescored"}


def test_rescore_existing_tests_fails_an_edited_test_and_keeps_the_other_gates(
    tmp_path,
):
    phase = tmp_path / "phase"
    edited = make_run(phase, "rung7-r1", 7)
    path = Path(rescored(edited)["workspace"]) / "tests" / "test_app.py"
    path.write_text(path.read_text().replace("assert", "assert True or", 1))
    hidden_fail = make_run(phase, "rung7-r2", 7, details=GOOD | {"hidden_pass": False})
    outside = make_run(
        phase, "rung7-r3", 7, details=GOOD | {"outside_write_list": ["pytest.ini"]}
    )
    rescore_existing_tests(phase)
    assert rescored(edited)["check_rescored"]["tests_unchanged"] is False
    assert rescored(edited)["check_rescored"]["passed"] is False
    for run in (hidden_fail, outside):
        assert rescored(run)["check_rescored"]["tests_unchanged"] is True
        assert rescored(run)["check_rescored"]["passed"] is False


def test_rescore_existing_tests_reports_a_missing_workspace_and_does_not_rerun(
    tmp_path,
):
    phase = tmp_path / "phase"
    run = make_run(phase, "rung8-r1", 8, workspace=False)
    results = rescore_existing_tests(phase)
    assert results == {"rung8-r1": "not rescorable: workspace missing"}
    assert rescored(run)["check_rescored"] == {
        "passed": None,
        "tests_unchanged": None,
        "rule": RESCORE_RULE,
        "rescorable": False,
        "reason": "workspace missing",
    }


def test_rescore_existing_tests_skips_rungs_1_to_5(tmp_path):
    phase = tmp_path / "phase"
    run = make_run(phase, "rung3-r1", 3, details={})
    before = (run / "run.json").read_text()
    assert rescore_existing_tests(phase) == {
        "rung3-r1": "skipped: rung 3 keeps its own check"
    }
    assert (run / "run.json").read_text() == before


def test_rescore_existing_tests_leaves_table_md_alone(tmp_path):
    phase = tmp_path / "phase"
    make_run(phase, "rung6-r1", 6)
    (phase / "table.md").write_text("as recorded\n")
    rescore_existing_tests(phase)
    assert (phase / "table.md").read_text() == "as recorded\n"


def test_cli_flag_runs_the_existing_tests_rescore(tmp_path, capsys):
    phase = tmp_path / "phase"
    run = make_run(phase, "rung6-r1", 6)
    main(["--existing-tests-kept", str(phase)])
    assert rescored(run)["check_rescored"]["passed"] is True
    assert "rung6-r1" in capsys.readouterr().out
