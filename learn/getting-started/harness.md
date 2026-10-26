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
profile, a child `pi` and a score. It is a teaching tool; `learn/code/harness.py` is the measured instrument, and
findings lessons cite the suites.

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

## What the runner sends

The runner does not start llama.cpp. `scripts/backend.py` owns the server;
the runner copies `learn/code/profile` into the run and points the child Pi at
that private copy. The copy is generated from `[tool.mellum]` in the root
`pyproject.toml`, so these are the values a run actually sends:
`temperature 1.0`, `top_p 0.95`, `top_k 20`, `max_tokens 16384`, with a
`context 50000`.

| Layer | Setting | Value |
| --- | --- | --- |
| Server | context | 50000 (`n_ctx 50176` when measured) |
| Pi request | temperature | 1.0 |
| Pi request | top_p | 0.95 |
| Pi request | top_k | 20 |
| Pi request | max_tokens | 16384 |
| Pi request | context window | 50000 |

These are Pi's out-of-the-box sampled settings, not greedy decoding. The
llama.cpp reference run used a different, greedy block; the suite runs are
not that run.

## Run it

```bash
uv run scripts/backend.py start      # the server from lesson 1
uv run learn/code/harness.py run --suite easy
```

The first line is only needed once. The second prints the child's argv if you
add `--dry-run`; otherwise it runs one task and prints a score line:

```text
easy: PASS (n=1; run /var/folders/...; 1 request, 3 tool calls, 0 tool errors)
```

`n=1` is one session: one workspace, one trace, one score. That is the
default, and it is an observation, not a rate. To run more sessions, add
`--repeat`:

```bash
uv run learn/code/harness.py run --suite easy --repeat 3
```

Each repeat starts from a fresh workspace; the lines are tagged `[1/3]` and
the summary is `easy: 3/3 sessions passed`. Two or three sessions are still a
lead, not a rate; lesson 4 explains why, and a rate needs a preregistered run
with its arms and n fixed first.

A suite may also ship a **spec variant**: the same project with its phased
requirements laid out another way. `--specs joined|split` runs the suite with
that variant's prompts and workspace, and the run record carries `specs`, so two
arms are told apart by the record rather than by memory.

```bash
uv run learn/code/harness.py run --suite medium --specs split --repeat 3
```

Only a suite with `spec-variants/` has them; `medium` ships `joined`, whose
briefs point at one `specs/roadmap.md`, and `split`, whose briefs each point at
their own `specs/phase-4.md`. Without the flag the suite runs exactly as
shipped.

The suite is `learn/code/suites/easy/`: a base AgentClinic project, one
prompt asking for phase 1, and the tests that check it. The prompt goes to
`pi -p` as the request; nothing else about the suite is shown to the model.

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

The numbers here are for you while you learn. They are not preregistered and they
run on one machine; a lesson's `reference-run` is the preregistered version of
the same run. Lesson 4 runs the eval
suites and reads the traces; the reference run on llama.cpp is a separate
phase.
