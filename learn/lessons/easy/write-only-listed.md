---
title: Write Only the Files You List
tier: easy
number: E2
time: 4 min read · 30 min to run
track: lessons
position: 6
prerequisites: [getting-started/suite]
authors: [Paul Everitt]
backends: [llamacpp]
---

# E2 · Write Only the Files You List

A run can pass every hidden test and still be wrong, leaving scratch files, a
second app copy or a test edited to pass. The page names the layout and checks
the file set after each run, which the easy suite never tripped.

!!! abstract "Overview"

    **Questions**

    - Can a run pass its tests and still leave the workspace wrong?
    - How do I check which files a run created or changed?

    **Objectives**

    - Declare a suite's layout with `allow` and `ignore` lists in `layout.json`.
    - Read the `out_of_layout` list in a run's `run.json`.
    - Recognise why a check is tested both ways before it is trusted.

![A small robot filing sheets into labelled folders, leaving one folder untouched](../../assets/illustrations/write-only-listed.webp){ .illustration }

## Problem

**Badge:** `screen`

A run can pass every hidden test and still be wrong. It can leave `notes.txt`
at the root, a second copy of the app, a scratch script, or an edited test that
made itself pass. The tests asked whether the feature works; nobody asked
whether the workspace is still the project.

The habit that answers it is to write only the files the task names, and the
instrument that checks it is a **file set**, not a behaviour: after the run,
compare the workspace with the copy taken before it started.

## Eval case

**Badge:** `screen`

The easy suite from [Getting started](../../getting-started/suite.md), one
prompt, three sessions of the shipped worker on llama.cpp: `llama-server`
0.7.0 (build 11669), Mellum 2.1 `Q4_K_M`, `-c 50000` (`n_ctx` 50,176),
`temperature 1`, `top_p 0.95`, `top_k 20`, `max_tokens 16384`.

Each suite declares its layout in `layout.json`:

```json
{
  "allow": ["app.py", "templates/**", "tests/**", "specs/**"],
  "ignore": [".venv/**", "__pycache__/**", "*.pyc", "*.log", "*.db",
             ".git/**", ".pytest_cache/**", "grader_tests/**"]
}
```

The harness hashes the workspace before the child starts and again after it
exits. Anything created or modified that matches neither `allow` nor `ignore`
is reported as `out_of_layout`, beside the passes, in the run's `run.json`.

## Evidence of the problem

**Badge:** `screen`

The instrument is worth nothing if it cannot fail, so it is tested both ways
before it is trusted: a workspace that only edits `app.py` reports nothing
outside, and a workspace that adds `notes.txt` reports exactly that file.

What the easy suite produced:

| Session | Passed | Requests | Tool errors | Created or modified outside the layout |
| --- | --- | --- | --- | --- |
| 1 | yes | 30 | 5 | **none** |
| 2 | no | 30 | 4 | **none** |
| 3 | yes | 26 | 5 | **none** |

Three sessions, zero out-of-layout writes. On this suite the pathology did
**not** appear, which is the second half of the lesson: a check that never
fires on a well-behaved task is how you learn where the task is well-behaved.

The behaviour was seen by hand first, in [The ditch](../../getting-started/ditch.md):
a loose session that reported success while writing outside the layout. That
is one hand-driven session (a screen, not a rate) and it is why the check
exists rather than why it fires.

## Solution

**Badge:** `screen`

Name the layout, then check it. Two habits:

1. **In the task:** list the files or directories the work may touch, and say
   that everything else is out of scope.
2. **In the harness:** compare the file set after the run with the one before
   it, and ignore the artefacts a run cannot avoid: the virtualenv, bytecode,
   logs, the test cache. Without the ignore list a run is accused of writing
   its own `.venv`, which is how a good check becomes noise.

## Validation

**Badge:** `screen`

### Evidence of the solution

| Suite | Arm | Sessions | Passes | Out of layout |
| --- | --- | --- | --- | --- |
| easy | `worker` | 3 | 2/3 | **0** |

A missing measurement is `n/a`, never `0`.

### Quality and budget

The two sessions that passed and the one that failed are equally clean, so the
check is independent of the outcome, which is the point of measuring it
separately. Medium was not run: every medium session in this cycle's other
arms hit the 600 s deadline, so a medium reading here would measure the
deadline, not the layout.

## Interpretation

The weakest badge is `screen`, and the honest summary is that on the easy suite
the pathology is **absent**: three of three sessions wrote only what the task
allowed, and two of them failed for other reasons.

What this page is worth right now is the instrument and the habit, not a pass
rate. It is the only lesson in this track whose value did not depend on the
model: the check runs after every session from now on, and the run's
`out_of_layout` list is what a later arm reads.

What would upgrade this: a task with more freedom than the easy suite (the
hard suite's seven-phase build, or a loose prompt like the ditch's), where
writing outside the layout is a tempting shortcut. That needs a deadline the
suite can finish inside, which this machine did not offer.

### Run it yourself

Run the shipped worker on the easy suite three times; each run's `run.json` carries its `out_of_layout` list:

```bash
uv run python learn/code/harness.py run --suite easy --arm worker --repeat 3 --grade --deadline 600
```

!!! success "Key points"

    - On the easy suite the pathology was absent: three of three sessions wrote only what the layout allowed (a screen).
    - The check is independent of the outcome; passing and failing sessions were equally clean.
    - An ignore list for unavoidable artefacts keeps the check from becoming noise.
    - The value here is the instrument and the habit, not a pass rate.
