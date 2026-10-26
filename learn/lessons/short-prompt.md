---
title: A short prompt, not a procedure
track: lessons
position: 2
prerequisites: [getting-started/worker-extension]
authors: [Paul Everitt]
backends: [llamacpp]
---

# A short prompt, not a procedure

A prompt that narrates a six-step procedure gives a small model more to
follow than the project needs, and every line is paid on every request. What
ships is 643 characters with no procedure, and this run does not show it
buying a pass.

## Problem

**Badge:** `screen`

A prompt that narrates a six-step procedure gives a small model more to
follow than the project needs. It spends turns on the narration and drifts
from the files, and every line has to be paid for on every request.

That is the argument. The measurement below does something less comfortable
with it: it shows the prompt not changing the pass count at all, while the
context cost moves — in the direction nobody wants.

## Eval case

**Badge:** `screen`

The easy suite from [Getting started](../getting-started/suite.md), one
prompt, graded by hidden pytest plus `ruff`, `pyrefly` and `complexipy`.
Three sessions per arm on llama.cpp, one change between them:

- `worker` — prompt v5, the 643-character task prompt replacing Pi's own.
- `no-prompt` — `MELLUM_WORKER_PROMPT=pi`: Pi's base prompt kept, everything
  else in the worker unchanged. The facts block, the guards and the seven
  tools are identical in both arms.

## Evidence of the problem

**Badge:** `screen`

Two samples, not pooled:

| Sample | With v5 | With Pi's prompt | Context |
| --- | --- | --- | --- |
| the 45-session record, easy/medium/hard, n=3 each | 3/9 | 3/9 | v5 7,834 vs 15,167 peak, easy |
| this run, easy only, n=3 | **2/3** | **1/3** | v5 peaks 1,639–33,443; no-prompt 4,762–20,773 |

Per session, easy only:

| Arm | Session | Passed | Turns | Tool errors | Peak input | Wall |
| --- | --- | --- | --- | --- | --- | --- |
| `worker` | 1 | **yes** | 21 | 4 | 1,639 | 185 s |
| `worker` | 2 | no | 22 | 2 | 33,443 | 275 s |
| `worker` | 3 | **yes** | 52 | 17 | 3,404 | 405 s |
| `no-prompt` | 1 | **yes** | 45 | 10 | 20,773 | 486 s |
| `no-prompt` | 2 | no | 26 | 3 | 4,762 | 419 s |
| `no-prompt` | 3 | no | 26 | 6 | 4,853 | 179 s |

The pass counts are one session apart in both samples: **3/9 against 3/9**
and **2/3 against 1/3**. The context numbers are not so consistent — this
run's passing `no-prompt` session peaked at 20,773 against the worker's 3,404
in its passing session, and the worker's losing session peaked at 33,443 — so
the direction of the context saving is not established here either. It was in
the 45-session record, on three suites.

## Solution

**Badge:** `screen`

Prompt v5: **643 characters**, the six test-command facts and the
missing-files line, no procedure. It is what ships, and the worker arm is that
prompt.

The design rule that built it survives the null: a line earns its place when a
run says so, and the one that cost a pass came back. That rule was exercised
on the oMLX ladder, which is why this page no longer shows those arms — the
current surface is `prompts/mellum-worker.md`, and it is worth reading as one
page rather than as a procedure.

## Validation

**Badge:** `screen`

### Evidence of the solution

| Suite | Arm | Passes | Turns | Tool errors | Peak input | Wall |
| --- | --- | --- | --- | --- | --- | --- |
| easy | prompt v5 (`worker`) | 2/3 | 31.7 | 7.7 | 33,443 | 288 s |
| easy | Pi's prompt (`no-prompt`) | 1/3 | 32.3 | 6.3 | 20,773 | 361 s |

The two arms are within one session and within 1.4× on wall. Nothing in this
table separates them.

## Interpretation

The weakest badge is `screen`, and this page is a **null**: on the easy suite
at n=3 the worker prompt did not beat Pi's own prompt, and the same was true
at 3/9 against 3/9 across three suites. The claim this page used to make —
that removing each line was paid for by a pass — rested on ladder ablations
that are no longer cited here.

What survives is the shape and the shipped artifact: 643 characters, no
procedure, a rule for what earns a line. What does not survive is any
statement that the prompt is worth a pass.

What would upgrade this: a longer prompt actually measured against v5 on the
suites — the arms exist, and the comparison has never been run on this
backend. A null against Pi's prompt is not a null against a bloated one.
