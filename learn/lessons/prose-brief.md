---
title: A prose brief stops at its first reply
track: lessons
position: 8
prerequisites: [getting-started/suite]
authors: [Paul Everitt]
backends: [llamacpp]
---

# A prose brief stops at its first reply

## Problem

**Badge:** `screen`

A multi-phase build can be handed to a worker two ways: as **steps** — one
brief per phase, each answered before the next arrives — or as **one prose
brief** that describes every phase at once and expects the model to work
through them in order.

The worry is that the second shape invites a first reply: the model answers the
first thing it read, calls that done, and never comes back for the rest. The
brief was complete; the reading of it was not.

## Eval case

**Badge:** `screen`

The medium suite from [Getting started](../getting-started/suite.md): four
phases of a FastAPI complaints app, graded by hidden pytest plus `ruff`,
`pyrefly` and `complexipy`. The same four brief files, the same base, the same
grader, and one change between the arms:

- **steps** — the suite's four `prompts/*.md`, one request each.
- **one brief** — `--single-prompt`, which joins those same four files with
  blank lines and sends them once.

One session per arm, because this is a **screen**: n = 1 per arm, no rate.

| | |
| --- | --- |
| Machine | Apple M1 Pro, 8 cores, 32 GiB |
| Backend | `llama-server` 0.7.0 (build 11669), Mellum 2.1 `Q4_K_M`, `-c 50000` (`n_ctx` 50,176) |
| Sampling | `temperature 1`, `top_p 0.95`, `top_k 20`, `max_tokens 16384` |
| Deadline | 1,800 s, measured on this machine before the run |

The machine matters: the records this center started from were taken on an M5
Max, and **wall seconds do not transfer between machines**. Peak token counts
do.

## Evidence of the problem

**Badge:** `screen`

| Arm | Session | Passed | Hidden tests | Lint | Requests | Peak input | Wall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| steps | `39df1a` | no | **pass** | `F401` | 53 | 11,369 | 894 s |
| one brief | `ad1bb7` | **yes** | pass | pass | 52 | 3,761 | 961 s |

**The pathology did not appear.** The one-brief session implemented all four
phases: every hidden test passed and the lint gate passed with it, in the same
number of requests as the stepped arm (52 against 53) and at about the same
wall (961 s against 894 s).

What actually separated the arms was **the steps arm's lint failure** — an
unused import (`models.Complaint`) — not phases two through four going
missing. Both arms' failing-check count is zero, which is the direct measure
of "did a phase's behaviour fail": none did, in either shape.

## Solution

**Badge:** `screen`

Send phases as steps when the task has phases. That is what the Getting
Started suite teaches, and the harness's default shape.

The reason is no longer "one brief loses phases" — this screen did not show
that. It is the smaller, safer one: steps give you a boundary where a phase
can be checked before the next arrives, and a one-brief run gives one grade at
the end with four phases' worth of work behind it. That is a claim about
diagnosis, not about whether the model can read a long brief.

## Validation

**Badge:** `screen`

### Evidence of the solution

| Suite | Arm | Passed | Requests | Peak input | Output tokens | Wall |
| --- | --- | --- | --- | --- | --- | --- |
| medium | steps | no (`F401`) | 53 | 11,369 | 31,305 | 894 s |
| medium | one brief | **yes** | 52 | 3,761 | 29,099 | 961 s |

### Quality and budget

The one-brief arm spent **a third of the context** (3,761 against 11,369 peak)
and produced slightly fewer output tokens (29,099 against 31,305), at 67 s more
wall. So on this one session the cheaper shape was also the one that passed.
That is a lead in the opposite direction from the lesson's original claim, and
one session cannot make it anything else.

## Interpretation

The weakest badge is `screen`, and it is the whole page: n = 1 per arm, one
task, one machine.

The claim this page used to carry — a one-prompt brief loses four passes, and
stepping it costs 2.4× the time — is **retired**. The screen measured neither
half of it: both shapes passed the hidden tests, the cost was 7% more wall
rather than 2.4×, and the only failing arm was the stepped one.

What survives is the design advice, at the strength the evidence gives it:
steps buy you a checkpoint per phase. What does not survive is any statement
that a small model reading a four-phase brief will stop after phase one.

What would upgrade this: n = 3 per arm on this machine at the same deadline,
which is roughly 1.5 hours of running, and a task whose phases fail
independently so that "stopped at the first reply" is observable at all. Until
then the honest sentence is "one session each, and the one-brief arm did
better".
