import importlib
import importlib.util
import json

import pytest


def trace_module():
    assert importlib.util.find_spec("ladder.pi_trace") is not None, (
        "trace integrity is not implemented"
    )
    return importlib.import_module("ladder.pi_trace")


def event(kind, seq, instance="a", **fields):
    return {
        "type": kind,
        "traceSchema": 1,
        "runId": "run",
        "instanceId": instance,
        "seq": seq,
        "timestamp": "2026-10-11T10:00:00Z",
        "elapsedMs": seq,
        "pid": 1,
        "requestId": None,
        **fields,
    }


def start(instance="a", **runtime):
    return event(
        "instance_start",
        1,
        instance,
        runtime={
            "piVersion": "1.1.0",
            "entryPath": "/pi",
            "execPath": "/node",
            "cwd": "/fixture",
            **runtime,
        },
    )


def summary(events, diagnostics=None, stderr=""):
    return trace_module().summarize_trace(
        events, diagnostics or [], stderr, {"executable": "/pi", "version": "1.1.0"}
    )


def test_truncated_final_line_keeps_earlier_evidence(tmp_path):
    path = tmp_path / "trace"
    path.write_text(json.dumps(start()) + '\n{"type":')
    events, problems = trace_module().load_trace(path)
    assert events == [start()]
    assert problems and "2" in problems[0]
    assert summary(events, problems)["status"] == "incomplete"


def test_missing_metadata_and_sink_diagnostics_are_incomplete():
    assert summary([start(), {"type": "tool_call"}])["status"] == "incomplete"
    assert (
        summary([start()], stderr="mellum-trace: disk full")["status"] == "incomplete"
    )
    assert summary([])["status"] == "incomplete"


@pytest.mark.parametrize(
    "runtime", [{"piVersion": "1.0.2"}, {"entryPath": "/other/pi"}]
)
def test_runtime_mismatch_invalidates_proof(runtime):
    assert summary([start(**runtime)])["status"] == "incomplete"


def test_duplicate_sequence_or_mixed_run_invalidates_proof():
    assert summary([start(), event("agent_start", 1)])["status"] == "incomplete"
    assert (
        summary([start(), event("agent_start", 2, runId="other")])["status"]
        == "incomplete"
    )


def test_same_tool_id_in_two_instances_stays_separate():
    rows = [
        start(),
        start("b"),
        event("tool_execution_start", 2, toolCallId="call"),
        event("tool_execution_start", 2, "b", toolCallId="call"),
        event("tool_execution_end", 3, toolCallId="call", durationMs=0),
        event("agent_settled", 4, aborted=False),
    ]
    report = summary(rows)
    assert report["status"] == "ok"
    assert report["instances"]["a"]["openCalls"] == []
    assert report["instances"]["b"]["openCalls"] == ["call"]
    assert report["instances"]["a"]["aborted"] is False
    assert report["instances"]["b"]["aborted"] is None


def test_legacy_durations_and_settlement_remain_unknown():
    report = summary([{"type": "provider_request", "request": 1, "payload": {}}])
    assert report["status"] == "legacy"
    assert report["instances"] == {}


def test_missing_execution_end_is_not_trace_corruption():
    report = summary([start(), event("tool_execution_start", 2, toolCallId="running")])
    assert report["status"] == "ok"
    assert report["instances"]["a"]["settled"] is False
    assert report["instances"]["a"]["aborted"] is None
    assert report["instances"]["a"]["openCalls"] == ["running"]


@pytest.mark.parametrize(
    "changes",
    [
        {"runtime": "bad"},
        {"timestamp": "invalid"},
        {"elapsedMs": -1},
        {"instanceId": ""},
    ],
)
def test_malformed_instrumentation_cannot_claim_complete(changes):
    row = start()
    row.update(changes)
    assert summary([row])["status"] == "incomplete"
