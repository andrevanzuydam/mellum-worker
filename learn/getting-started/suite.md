---
title: A suite and the telemetry
track: getting-started
position: 4
prerequisites: [getting-started/harness]
authors: [Paul Everitt]
backends: [llamacpp]
---

# A suite and the telemetry

Lesson 2 made one isolated run. This one runs three tasks, grades the code the
model wrote, and reads the trace to see why a task failed.

## Run the suite

```bash
uv run scripts/backend.py start
uv run learn/code/harness.py suite all --grade
```

`all` expands to the three tasks in `learn/code/tasks/`: `easy` asks for a
FizzBuzz function, `medium` for a duration parser, and `hard` for a word-count
CLI with a tie rule and a minimum length. Each task runs in its own directory,
as lesson 2 described.

One line per task, then a total:

```text
easy: PASS (run learn/code/.runs/...; 4 requests, 3 tool calls, 0 tool errors)
medium: PASS (run learn/code/.runs/...; 7 requests, 6 tool calls, 1 tool errors)
hard: FAIL (run learn/code/.runs/...; 12 requests, 11 tool calls, 2 tool errors)
2/3 passed
```

A `FAIL` does not stop the suite; the run stays on disk and its test tail is
printed to stderr.

## The three graders

`--grade` runs the Validation step's static analysis on the model's files,
after the child exits and before the tests are copied in, so a test file can
never change the result:

- **`ruff`** — lint, default rules: unused imports, undefined names.
- **`pyrefly`** — types, with a generated `pyrefly.toml` (`project-includes`
  for the workspace, `tests/**` excluded). A bare path reports no errors, so
  the config is not optional.
- **`complexipy`** — cognitive complexity, failing above 10.

They print beside the score, not instead of it:

```text
medium: PASS (run ...; 7 requests, 6 tool calls, 1 tool errors)
ruff: PASS
pyrefly: PASS
complexipy: PASS
```

A `FAIL` here is a finding about the code, not about the tests: the model can
produce something that passes its tests and still has an unused import, a type
lie or a function too tangled to read.

## Read the trace

Every run writes `trace.jsonl` beside its workspace. Each line is one row with
a `type`; the ones to read first:

- `provider_request` — one turn sent to the model;
- `tool_call` and `tool_result` — what it reached for, and whether the call
  errored;
- `message_end` — a message, including the final reply's text;
- `agent_settled` — the run ended.

So a hard task that fails with 12 requests and 2 tool errors is telling you it
kept going and kept hitting errors; a task that fails with 1 request and no
tool calls wrote nothing. The counts on the score line are these rows, summed.

## One session is not a rate

A suite is a handful of sessions, and each session is one observation. The
same task can pass next time: the model varies, and this harness runs a task
once by default; `--repeat 2` runs the whole session again and states its n.
Run it again before believing a difference, and still treat two or three
sessions as a lead, not a rate. Rates come from the ladder with
a preregistered arm, which is why findings lessons cite `docs/ladder/` and
not these sessions.

## What this does and does not say

Three runs on one machine are a lead, not a rate. If easy passes and hard
fails, the harness has shown you *where* to look — a tool error, a missing
file, a final reply that claims success — not how often a model fails. A
preregistered reference run on llama.cpp is the next phase; findings lessons
cite the ladder, never these three runs.
