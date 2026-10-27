#!/usr/bin/env python
"""Emit chat-format training examples (JSONL) from the tasks.

Each verified task becomes one example: the specification (with a completeness
instruction) as the user turn, the full reference solution as the assistant
turn. The trainer applies the model's own chat template; we only supply the
messages. Verify tasks first (guard + checks) — export does not re-verify.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent
TASKS = ROOT / "tasks"

INSTRUCTION = (
    "Build this application completely in the given stack (FastAPI, Jinja2, "
    "SQLite via sqlite-utils). Implement every requirement in the "
    "specification — every route, column, status code, and migration — not "
    "just the first one. Return every file in full."
)


def read_reference(ref: Path) -> str:
    parts = []
    for p in sorted(ref.rglob("*")):
        if p.is_file() and "__pycache__" not in p.parts:
            rel = p.relative_to(ref)
            parts.append(f"### {rel}\n```\n{p.read_text()}\n```")
    return "\n\n".join(parts)


def example(task: Path) -> dict:
    spec = (task / "task.md").read_text()
    solution = read_reference(task / "reference")
    return {
        "task": task.name,
        "messages": [
            {"role": "user", "content": f"{INSTRUCTION}\n\n{spec}"},
            {"role": "assistant", "content": solution},
        ],
    }


def main(argv: list[str]) -> int:
    out = ROOT / "dataset.jsonl"
    tasks = [t for t in sorted(TASKS.iterdir()) if (t / "task.md").exists()]
    with out.open("w") as f:
        for t in tasks:
            f.write(json.dumps(example(t)) + "\n")
    print(f"wrote {len(tasks)} example(s) -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
