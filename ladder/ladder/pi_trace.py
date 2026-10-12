"""Read partial evidence honestly; validate instrumentation, never task success."""

import json
from datetime import datetime
from pathlib import Path


def load_trace(path: Path) -> tuple[list[dict], list[str]]:
    events, issues = [], []
    if not path.exists():
        return events, issues
    for number, line in enumerate(path.read_text(errors="replace").splitlines(), 1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
            if not isinstance(value, dict) or not isinstance(value.get("type"), str):
                raise TypeError("event must be an object with a type")
            events.append(value)
        except (TypeError, ValueError) as error:
            issues.append(f"trace line {number}: {error}")
    return events, issues


def summarize_trace(
    events: list[dict], diagnostics: list[str], stderr: str, expected_pi: dict
) -> dict:
    issues = list(diagnostics)
    issues += [line for line in stderr.splitlines() if line.startswith("mellum-trace:")]
    instances, sequences, open_calls = {}, {}, {}
    if not events:
        issues.append("no recorder evidence")
    elif all("traceSchema" not in event for event in events):
        return {
            "status": "incomplete" if issues else "legacy",
            "issues": issues,
            "instances": {},
        }
    run_id = None
    for event in events:
        identity, seq = event.get("instanceId"), event.get("seq")
        if (
            event.get("traceSchema") != 1
            or not isinstance(identity, str)
            or not identity
            or type(seq) is not int
        ):
            issues.append("missing or unsupported trace metadata")
            continue
        if (
            not event.get("runId")
            or not isinstance(event.get("timestamp"), str)
            or not isinstance(event.get("elapsedMs"), (int, float))
        ):
            issues.append(f"{identity}: missing clock/run metadata")
        try:
            datetime.fromisoformat(event["timestamp"])
            if event["elapsedMs"] < 0:
                raise ValueError("negative elapsed time")
        except KeyError, TypeError, ValueError:
            issues.append(f"{identity}: invalid clock metadata")
        if run_id is None:
            run_id = event.get("runId")
        elif event.get("runId") != run_id:
            issues.append("mixed run identities")
        if seq != sequences.get(identity, 0) + 1:
            issues.append(f"{identity}: missing, repeated or reordered sequence")
        sequences[identity] = seq
        kind = event["type"]
        if kind == "instance_start":
            runtime = event.get("runtime") or {}
            if not isinstance(runtime, dict):
                issues.append(f"{identity}: malformed runtime metadata")
                runtime = {}
            if identity in instances:
                issues.append(f"{identity}: repeated instance start")
            instances[identity] = {
                "runtime": runtime,
                "settled": False,
                "aborted": None,
                "openCalls": [],
            }
            open_calls[identity] = set()
            if runtime.get("piVersion") != expected_pi["version"]:
                issues.append(f"{identity}: Pi version mismatch or unknown")
            paths = [runtime.get("entryPath"), runtime.get("execPath")]
            if not any(
                isinstance(path, str)
                and path
                and Path(path).resolve() == Path(expected_pi["executable"]).resolve()
                for path in paths
            ):
                issues.append(f"{identity}: Pi executable mismatch or unknown")
        elif identity not in instances:
            issues.append(f"{identity}: no instance start")
        elif kind == "agent_settled":
            instances[identity]["settled"] = True
            instances[identity]["aborted"] = event.get("aborted")
        elif kind == "tool_execution_start" and event.get("toolCallId"):
            open_calls[identity].add(event["toolCallId"])
        elif kind == "tool_execution_end" and event.get("toolCallId"):
            open_calls[identity].discard(event["toolCallId"])
    for identity, instance in instances.items():
        instance["openCalls"] = sorted(open_calls[identity])
    return {
        "status": "incomplete" if issues else "ok",
        "issues": issues,
        "instances": instances,
    }


def stdout_settlement(stdout: str) -> dict:
    """Observe the parent/Mode JSON stream without equating exit with settlement."""
    settled, aborted = False, None
    for line in stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if isinstance(event, dict) and event.get("type") == "agent_settled":
            settled, aborted = True, event.get("aborted")
    return {"settled": settled, "aborted": aborted}
