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
from datetime import UTC, datetime
from pathlib import Path

CODE = Path(__file__).resolve().parent
RUNS = CODE / ".runs"
TASKS = CODE / "tasks"
RECORDER = CODE / "record-pi.mjs"
PROFILE = CODE / "profile"
FLAGS = [
    "-p", "--no-approve", "--no-extensions", "--no-skills",
    "--no-prompt-templates", "--no-themes", "--no-context-files",
]


@dataclass(frozen=True)
class Task:
    name: str
    prompts: list[str]
    tests: Path
    start: Path | None

    @property
    def prompt(self) -> str:
        return self.prompts[0]


def _read_prompt(path: Path) -> str:
    text = path.read_text().strip()
    if not text:
        raise SystemExit(f"empty prompt: {path}")
    return text


def load_task(tasks_dir: Path, name: str) -> Task:
    base = Path(tasks_dir) / name
    prompts_dir = base / "prompts"
    if prompts_dir.is_dir():
        files = sorted(prompts_dir.glob("*.md"))
        if not files:
            raise SystemExit(f"no prompts in {prompts_dir}")
        prompts = [_read_prompt(path) for path in files]
    else:
        prompts = [_read_prompt(base / "task.md")]
    start = base / "start"
    return Task(
        name=name,
        prompts=prompts,
        tests=base / "tests",
        start=start if start.is_dir() else None,
    )


def profile_pin(profile_dir: Path) -> tuple[str, str]:
    providers = json.loads((Path(profile_dir) / "models.json").read_text())["providers"]
    provider = next(iter(providers))
    return provider, providers[provider]["models"][0]["id"]


def new_run(runs_dir: Path, name: str) -> Path:
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
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
    *,
    session_id: str | None = None,
    session_dir: Path | None = None,
) -> list[str]:
    session = (
        ["--session-id", session_id, "--session-dir", str(session_dir)]
        if session_id and session_dir
        else []
    )
    return [
        pi_binary, *FLAGS, "--provider", provider, "--model", model,
        *session, "-e", str(recorder), prompt,
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
    (run / "prompt.txt").write_text("\n\n".join(task.prompts) + "\n")
    trace = run / "trace.jsonl"
    trace.touch()
    sessions = run / "sessions"
    sessions.mkdir()
    provider, model = profile_pin(profile)
    session_id = str(uuid.uuid4())
    env = {
        **os.environ,
        "PI_CODING_AGENT_DIR": str(run / "profile"),
        "MELLUM_TRACE_FILE": str(trace),
    }
    for prompt in task.prompts:
        argv = pi_argv(
            pi_binary, run / "profile", RECORDER, provider, model, prompt,
            session_id=session_id, session_dir=sessions,
        )
        try:
            subprocess.run(argv, cwd=workspace, env=env, check=False)
        except FileNotFoundError:
            raise SystemExit(f"pi not found: {pi_binary}; install Pi before running a task")
    return run


def grade(workspace: Path) -> list[tuple[str, bool, str]]:
    workspace = Path(workspace)
    (workspace / "pyrefly.toml").write_text(
        'project-includes = [\n    "**/*.py",\n]\n'
        'project-excludes = [\n    "tests/**",\n]\n')
    commands = (
        ("ruff", ["uvx", "ruff", "check", "--exclude", "tests", "."]),
        ("pyrefly", ["uvx", "pyrefly", "check", "."]),
        ("complexipy", ["uvx", "complexipy", "--max-complexity-allowed", "10",
                        "--exclude", "tests", "."]),
    )
    results = []
    for name, command in commands:
        result = subprocess.run(
            command, cwd=workspace, capture_output=True, text=True, check=False,
            env={**os.environ, "PYTHONPATH": str(workspace)},
        )
        output = [line for line in (result.stdout + result.stderr).splitlines()
                  if line.strip()]
        results.append((name, result.returncode == 0, output[0] if output else ""))
    return results


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


def _run_sessions(
    task: Task,
    *,
    runs_dir: Path,
    pi_binary: str,
    repeat: int,
    grade_run: bool,
) -> list[tuple[Path, bool, str, list, dict]]:
    results = []
    for _ in range(repeat):
        run_dir = run_task(task, runs_dir=runs_dir, pi_binary=pi_binary)
        grades = grade(run_dir / "workspace") if grade_run else []
        passed, tail = score(run_dir, task)
        results.append((run_dir, passed, tail, grades, report(run_dir)))
    return results


def _print_task(
    task: Task, results: list[tuple], repeat: int
) -> int:
    for index, (run_dir, passed, tail, grades, counts) in enumerate(results, 1):
        print(_line(task, run_dir, passed, counts, repeat, index))
        _print_grades(grades)
        if not passed:
            print(tail, file=sys.stderr)
    ok = sum(1 for result in results if result[1])
    if repeat > 1:
        print(f"{task.name}: {ok}/{repeat} sessions passed")
    return ok


def suite(
    names: list[str],
    *,
    tasks_dir: Path = TASKS,
    runs_dir: Path = RUNS,
    pi_binary: str = "pi",
    grade_run: bool = False,
    repeat: int = 1,
) -> tuple[int, int]:
    available = sorted(
        path.name for path in Path(tasks_dir).iterdir()
        if (path / "tests").is_dir()
        and ((path / "task.md").exists() or (path / "prompts").is_dir())
    )
    if "all" in names:
        names = available
    missing = [name for name in names if name not in available]
    if missing:
        raise SystemExit(f"no task named {', '.join(missing)} in {tasks_dir}; "
                         f"available: {', '.join(available)}")
    tasks_passed = sessions_passed = sessions_total = 0
    for name in names:
        task = load_task(tasks_dir, name)
        results = _run_sessions(
            task, runs_dir=runs_dir, pi_binary=pi_binary,
            repeat=repeat, grade_run=grade_run,
        )
        sessions_passed += _print_task(task, results, repeat)
        sessions_total += len(results)
        if all(result[1] for result in results):
            tasks_passed += 1
    print(f"{tasks_passed}/{len(names)} tasks passed "
          f"({sessions_passed}/{sessions_total} sessions)")
    return tasks_passed, len(names)


def _line(
    task: Task,
    run_dir: Path,
    passed: bool,
    counts: dict,
    repeat: int = 1,
    index: int = 1,
) -> str:
    tag = task.name + (f" [{index}/{repeat}]" if repeat > 1 else "")
    n_text = f"n={repeat}; " if repeat == 1 else ""
    return (f"{tag}: {'PASS' if passed else 'FAIL'} ({n_text}run {run_dir}; "
            f"{counts['requests']} requests, {counts['tool_calls']} tool calls, "
            f"{counts['tool_errors']} tool errors)")


def _print_grades(grades: list[tuple[str, bool, str]]) -> None:
    for name, ok, detail in grades:
        print(f"{name}: {'PASS' if ok else 'FAIL'}" + (f" ({detail})" if not ok else ""))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run", help="run one task and score it")
    run.add_argument("--task", required=True)
    run.add_argument("--tasks-dir", type=Path, default=TASKS)
    run.add_argument("--runs-dir", type=Path, default=RUNS)
    run.add_argument("--pi-binary", default="pi")
    run.add_argument("--dry-run", action="store_true")
    run.add_argument("--grade", action="store_true")
    run.add_argument("--repeat", type=int, default=1)

    many = sub.add_parser("suite", help="run several tasks and total them")
    many.add_argument("names", nargs="+", help="easy, medium, hard, all, or several")
    many.add_argument("--tasks-dir", type=Path, default=TASKS)
    many.add_argument("--runs-dir", type=Path, default=RUNS)
    many.add_argument("--pi-binary", default="pi")
    many.add_argument("--grade", action="store_true")
    many.add_argument("--repeat", type=int, default=1)
    args = parser.parse_args(argv)

    if args.repeat < 1:
        parser.error("--repeat must be at least 1")

    if args.command == "suite":
        suite(args.names, tasks_dir=args.tasks_dir, runs_dir=args.runs_dir,
              pi_binary=args.pi_binary, grade_run=args.grade,
              repeat=args.repeat)
        return 0


    task = load_task(args.tasks_dir, args.task)
    provider, model = profile_pin(PROFILE)
    if args.dry_run:
        print(shlex.join(pi_argv(args.pi_binary, PROFILE, RECORDER, provider,
                                 model, task.prompt)))
        return 0
    results = _run_sessions(
        task, runs_dir=args.runs_dir, pi_binary=args.pi_binary,
        repeat=args.repeat, grade_run=args.grade,
    )
    _print_task(task, results, args.repeat)
    return 0


if __name__ == "__main__":
    sys.exit(main())
