---
title: The primary agent is the wrong worker
track: lessons
position: 1
prerequisites: [getting-started/worker-extension]
authors: [Paul Everitt]
backends: [llamacpp]
---

# The primary agent is the wrong worker

The primary agent lets one small model plan, choose and decide it is finished,
so its failures arrive as yours: a server that never returns, a file outside
the layout, a burned deadline. The worker takes those decisions away and fails
smaller.

## Problem

**Badge:** `screen`

Ask Mellum to own the plan, pick the tools and decide it is finished, and the
failure is not a wrong answer: it is a confident final over work it never
checked. Nothing outside the model knows what "finished" meant, so a missed
phase, a narrowed test or a hang arrives as your result, and the turns, the
context and the wall clock arrive as your bill.

This page used to argue that from a pass rate. The run below does not support
that: on easy and on medium the two arms passed the same number of sessions,
and the older 8/15 is retired. What the run does support is the shape of the
failure — what the unbounded agent costs while getting nowhere, and how much
of it the bound removes.

## Eval case

**Badge:** `screen`

The easy and medium suites from [Getting started](../getting-started/suite.md),
three sessions per arm, one arm per policy, on llama.cpp at n = 3. The run was
preregistered with its arms, n, reading and decision rule fixed before it
started:

- `bare` — Pi with no extension: the **primary agent**, Mellum as the model in
  charge, with Pi's seven file tools.
- `worker` — the shipped worker: prompt v5, the same seven tools, the
  empty-final nudge, the loop breaker and project facts.

## Evidence of the problem

**Badge:** `reference-run`

Twelve sessions on Apple M1 Pro, 8 cores, 32 GiB, `--deadline 2700`, the
learner's profile. Passes, and what each arm did on the way:

| Suite | Arm | Passed | Failed checks | Requests | Tool errors | Peak input | Wall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| easy | `bare` | 1/3 | 4, 4, 0 | 16, 13, 21 | 2, 2, 3 | 1,587 | 117, 70, 180 s |
| easy | `worker` | 1/3 | 3, 0, 4 | 24, 37, 43 | 2, 7, 5 | 6,971 | 209, 291, 402 s |
| medium | `bare` | 0/3 | 18, 18, 18 | 45, 54, 60 | 3, 0, 9 | 11,508 | 827, 997, 1,051 s |
| medium | `worker` | 0/3 | 2, 12, 2 | 60, 26, 38 | 7, 1, 1 | 37,110 | 1,351, 587, 956 s |

The pass counts are one session apart on easy and identical on medium, so the
rule reads **null on both suites**. The baseline's medium sample — the worker
at 2/3 against the primary agent's 0/3 on an M5 Max — did not reproduce here,
and the page no longer leans on it.

Two of the three `bare` easy sessions ended on the deadline, both after a
foreground `uvicorn … --reload` that never returned; `worker` censored none.
`main.py` appeared outside the layout in two `bare` sessions and in no worker
session. On medium both arms passed nothing, which is a floor: a suite both
arms fail cannot separate them, and the null there means "not separated", not
"equivalent".

## Solution

**Badge:** `screen`

The model is not the thing you change. Pi is the main agent in both arms and
Mellum is the model inside it; what changes is which decisions the model's own
text is allowed to make. The worker takes three of them
(`extensions/mellum-worker.ts`):

- **Which tools exist:** `pi.setActiveTools(WORKER_TOOLS)` narrows the set to
  seven file tools — `read`, `grep`, `find`, `ls`, `bash`, `edit`, `write`
  (line 411).
- **What the instructions are:** `before_provider_request` replaces the system
  message with prompt v5, whose last line defines done as "the test command
  exits 0" (line 577).
- **Whether the turn is finished:** `agent_before_settle` can refuse to settle
  an empty turn, up to three times, and the loop breaker blocks the next
  identical tool call after five (line 614).

The plan stays with the operator — one task per `/mellum` — and in a measured
run the verdict is a separate act: the hidden tests are copied in and scored
after the model has stopped talking.

The guard is the thinnest of the three: it fired zero times in this run and in
the ten easy sessions before it, so what carried these sessions was the test
command and the operator's scoring.

## Validation

**Badge:** `reference-run`

### Evidence of the solution

Same twelve sessions, read as failure cost rather than success rate:

| Suite | Arm | Passed | Failed checks | Censored | Outside the layout |
| --- | --- | --- | --- | --- | --- |
| easy | `bare` | 1/3 | 4, 4, 0 | **2** | **2** |
| easy | `worker` | 1/3 | 3, 0, 4 | 0 | 0 |
| medium | `bare` | 0/3 | 18, 18, 18 | 0 | 0 |
| medium | `worker` | 0/3 | 2, 12, 2 | 0 | 0 |

The bound did not buy a pass. It bought cheaper failures: the worker never
burned a deadline, never wrote outside the layout, and on medium its failed
checks were 2, 12 and 2 against 18, 18 and 18. One `bare` session did pass —
after its work was finished, while it sat on a server it had started and could
not stop, and the harness killed it at the deadline and scored it anyway.

## Interpretation

The weakest badge is `screen`: the Eval case, the pathology and the mechanism
rest on one machine, one task per suite, and n = 3. Steps 3 and 5 carry
`reference-run` because the run was preregistered, recorded and published —
not because its answer was the one the page wanted.

The null is the finding. At n = 3 the pass rate does not separate a bounded
worker from an unbounded one on easy, and medium cannot separate them at all
while both arms fail every session. What separates them is the failure: the
unbounded agent starts servers it does not stop and writes where it was not
asked to, and the operator pays in wall clock and in a result they then have
to check.

Dated note, 2026-10-27: the medium rows above were measured before the medium
suite's spec gained its acceptance criteria, its `models.py` layout and its own
seeded test. They are a record of that fixture and do not reproduce against
today's — the arms did not change, the project they were given did.

Changed 2026-10-25: steps 3 and 5 moved from `screen` to `reference-run` on
[the record](https://github.com/pauleveritt/mellum-worker/blob/main/docs/superpowers/research/2026-10-25-lesson1-run.md),
whose twelve run directories are in the
[`research-2026-10-25`](https://github.com/pauleveritt/mellum-worker/releases/tag/research-2026-10-25)
release, and the page's claim narrowed from a pass-rate gap to the cost of
failing. The
baseline's medium 2/3 against 0/3 was not reproduced.

What would upgrade this: a medium task the worker can pass, so the floor
becomes a contrast; n larger than three; and the same run on a second machine,
since nothing here transfers across hardware.
