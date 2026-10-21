---
title: Make a mini harness
track: getting-started
position: 3
prerequisites: [getting-started/ditch]
authors: [Paul Everitt]
backends: [llamacpp]
---

# Make a mini harness

A harness runs a model on a task and scores the result. The one in this repo
is small enough to read: each run gets a fresh directory, its own copy of the
profile, a child `pi` and a score. It is a teaching tool; the ladder in
`ladder/` is the measured instrument, and findings lessons cite the ladder
only.

## Why a fresh directory

Three things make a score mean something:

- **A fresh directory.** The task is copied into a run's own workspace, so a
  previous run's files cannot help or hurt it.
- **A private profile.** The child gets `PI_CODING_AGENT_DIR` pointing at a
  copy of `learn/code/profile/`, plus `--no-extensions --no-skills
  --no-context-files --no-approve`, so your `~/.pi` and this repo's
  `AGENTS.md` stay out of it.
- **Hidden tests.** A task's tests are copied into the workspace only after
  the child has exited. Until then the model cannot read what it will be
  graded on.

A task holds one prompt (`task.md`) or several (`prompts/01-*.md`, sorted by
name). Several prompts run in **one session**: one workspace, one trace and
one Pi session id, with the prompts sent in order. Scoring happens once, at
the finish, never between prompts.

## Run it

```bash
uv run scripts/backend.py start      # the server from lesson 1
uv run learn/code/harness.py run --suite easy
```

The first line is only needed once. The second prints the child's argv if you
add `--dry-run`; otherwise it runs one task and prints a score line:

```text
easy: PASS (run learn/code/.runs/20261020T191642Z-easy-7d0bde)
```

The task is `learn/code/tasks/easy/`: a prompt asking for `fizz.py` and the
tests that check it. The prompt goes to `pi -p` as the request; nothing else
about the task is shown to the model.

## Read the run

The run directory keeps everything the score rested on:

- `prompt.txt` — exactly what the child was asked;
- `workspace/` — what it wrote, with `tests/` copied in once it exited;
- `profile/` — the private Pi profile used for this run;
- `trace.jsonl` — the recorder's rows: requests, tool calls, tool errors and
  the final message.

`PASS` means the tests passed. `FAIL` still leaves the run in place and prints
the test tail, so you can see whether the model wrote nothing, wrote the wrong
thing, or wrote something the tests could not import.

## What this does not measure

The numbers here are for you while you learn. They are not preregistered, they
run on one machine, and they do not replace `docs/ladder/`. Lesson 4 runs the eval
suites and reads the traces; the reference run on llama.cpp is a separate
phase.
