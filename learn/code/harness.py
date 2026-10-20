#!/usr/bin/env python3
"""Run one task through base Pi in a fresh directory and score it.

The ladder measures; this teaches. A task's tests stay out of the workspace
until the child has exited, and the private profile is copied per run, so a
run cannot see another run or the learner's own `~/.pi`.
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import subprocess
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

CODE = Path(__file__).resolve().parent
RUNS = CODE / ".runs"
TASKS = CODE / "tasks"
RECORDER = CODE / "record-pi.mjs"
PROFILE = CODE / "profile"
FLAGS = [
    "-p", "--no-session", "--no-approve", "--no-extensions", "--no-skills",
    "--no-prompt-templates", "--no-themes", "--no-context-files",
]


@dataclass(frozen=True)
class Task:
    name: str
    prompt: str
    tests: Path
    start: Path | None


def load_task(tasks_dir: Path, name: str) -> Task:
    base = Path(tasks_dir) / name
    start = base / "start"
    return Task(
        name=name,
        prompt=(base / "task.md").read_text().strip(),
        tests=base / "tests",
        start=start if start.is_dir() else None,
    )


def profile_pin(profile_dir: Path) -> tuple[str, str]:
    providers = json.loads((Path(profile_dir) / "models.json").read_text())["providers"]
    provider = next(iter(providers))
    return provider, providers[provider]["models"][0]["id"]


def new_run(runs_dir: Path, name: str) -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run = Path(runs_dir) / f"{stamp}-{name}-{uuid.uuid4().hex[:6]}"
    run.mkdir(parents=True)
    return run


def pi_argv(
    pi_binary: str,
    profile: Path,
    recorder: Path,
    provider: str,
    model: str,
    prompt: str,
) -> list[str]:
    return [
        pi_binary, *FLAGS, "--provider", provider, "--model", model,
        "-e", str(recorder), prompt,
    ]


def run_task(
    task: Task,
    *,
    runs_dir: Path,
    profile: Path = PROFILE,
    pi_binary: str = "pi",
) -> Path:
    run = new_run(runs_dir, task.name)
    workspace = run / "workspace"
    workspace.mkdir()
    shutil.copytree(profile, run / "profile")
    if task.start is not None:
        shutil.copytree(task.start, workspace, dirs_exist_ok=True)
    (run / "prompt.txt").write_text(task.prompt + "\n")
    trace = run / "trace.jsonl"
    trace.touch()
    provider, model = profile_pin(profile)
    env = {
        **os.environ,
        "PI_CODING_AGENT_DIR": str(run / "profile"),
        "MELLUM_TRACE_FILE": str(trace),
    }
    argv = pi_argv(pi_binary, run / "profile", RECORDER, provider, model, task.prompt)
    try:
        subprocess.run(argv, cwd=workspace, env=env, check=False)
    except FileNotFoundError:
        raise SystemExit(f"pi not found: {pi_binary}; install Pi before running a task")
    return run


def report(run: Path) -> dict:
    rows = [
        json.loads(line)
        for line in (Path(run) / "trace.jsonl").read_text().splitlines()
        if line.strip()
    ]
    final = ""
    for row in reversed(rows):
        if row.get("type") != "message_end":
            continue
        message = row.get("message") or {}
        if message.get("role") != "assistant":
            continue
        for block in message.get("content") or []:
            if block.get("type") == "text" and block.get("text"):
                final = block["text"]
                break
        if final:
            break
    return {
        "requests": sum(row.get("type") == "provider_request" for row in rows),
        "tool_calls": sum(row.get("type") == "tool_call" for row in rows),
        "tool_errors": sum(
            row.get("type") == "tool_result" and row.get("isError") for row in rows),
        "final_reply": final,
    }


def score(run: Path, task: Task) -> tuple[bool, str]:
    workspace = Path(run) / "workspace"
    target = workspace / "tests"
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(task.tests, target)
    result = subprocess.run(
        ["uvx", "pytest", "-q", "tests"],
        cwd=workspace, capture_output=True, text=True, check=False,
        env={**os.environ, "PYTHONPATH": str(workspace)},
    )
    output = (result.stdout + result.stderr).strip()
    tail = "\n".join(output.splitlines()[-20:])
    return result.returncode == 0, tail


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run", help="run one task and score it")
    run.add_argument("--task", required=True)
    run.add_argument("--tasks-dir", type=Path, default=TASKS)
    run.add_argument("--runs-dir", type=Path, default=RUNS)
    run.add_argument("--pi-binary", default="pi")
    run.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    task = load_task(args.tasks_dir, args.task)
    provider, model = profile_pin(PROFILE)
    if args.dry_run:
        print(shlex.join(pi_argv(args.pi_binary, PROFILE, RECORDER, provider,
                                 model, task.prompt)))
        return 0
    run_dir = run_task(task, runs_dir=args.runs_dir, pi_binary=args.pi_binary)
    passed, tail = score(run_dir, task)
    counts = report(run_dir)
    print(f"{task.name}: {'PASS' if passed else 'FAIL'} (run {run_dir}; "
          f"{counts['requests']} requests, {counts['tool_calls']} tool calls, "
          f"{counts['tool_errors']} tool errors)")
    if not passed:
        print(tail, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
