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
so a confident final over unchecked code is the result. The worker takes those
three decisions out of the model's text and leaves the plan and the verdict
with you.

## Problem

**Badge:** `screen`

Ask Mellum to own the plan, pick the tools and decide it is finished, and the
failure is not a wrong answer: it is a confident final over work it never
checked. Nothing outside the model knows what "finished" meant, so a missed
phase, a narrowed test or a hang arrives as your result, and the turns, the
context and the wall clock arrive as your bill.

That is the pathology. This page tests whether moving the plan and the stop
condition out of the model's hands answers it, and the evidence is thinner
than the claim the page used to make: on easy an unbounded Pi finished one
session in three, and the old 8/15 is retired. What survives is the shape of
the bound and the baseline's medium contrast, 2/3 against 0/3.

## Eval case

**Badge:** `screen`

The easy suite from [Getting started](../getting-started/suite.md), one
prompt: implement phase 1 of a small FastAPI complaints app, graded by hidden
pytest plus `ruff`, `pyrefly` and `complexipy`. Three sessions per arm, one
arm per policy, on llama.cpp:

- `bare` — Pi with no extension: the **primary agent**, Mellum as the model
  in charge, with Pi's seven file tools.
- `worker` — the shipped worker: prompt v5, the same seven tools, the
  empty-final nudge, the loop breaker and project facts.

That pairing is the lesson's own comparison rather than an analogy: the only
difference is the extension.

## Evidence of the problem

**Badge:** `screen`

Two samples of the same contrast, neither pooled with the other:

| Sample | Primary agent | Bounded worker |
| --- | --- | --- |
| [The suite baseline](baseline.md), easy/medium/hard, n=3 each | 0/9 | 3/9 |
| This run, easy only, n=3 | **1/3** | **2/3** |

Per session, easy only:

| Arm | Session | Passed | Turns | Failed checks | Tool errors | Peak input | Wall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `bare` | 1 | **yes** | 20 | 0 | 2 | 1,589 | 189 s |
| `bare` | 2 | no | 20 | 0 | 2 | 2,980 | 179 s |
| `bare` | 3 | no | 18 | 2 | 2 | 1,589 | 90 s, then killed |
| `worker` | 1 | **yes** | 21 | 0 | 4 | 1,639 | 185 s |
| `worker` | 2 | no | 22 | 4 | 2 | 33,443 | 275 s |
| `worker` | 3 | **yes** | 52 | 0 | 17 | 3,404 | 405 s |

The baseline sample separates the two on the medium suite, where the worker
took 2 of 3 and the primary agent none. This run adds what the baseline could
not: **an unbounded Pi can pass this suite.** Its pass was not a fluke of
spending more — `bare` peaked at 1,589–2,980 tokens, under the worker's
1,639–33,443, and its failures were ordinary ones, one of them a hang.
"Unbounded" did not mean "bigger".

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

The guard is the thinnest of the three: on easy it never fired, zero nudges in
ten sessions (LC.13A), so what carried those runs was the test command and the
operator's scoring.

## Validation

**Badge:** `screen`

### Evidence of the solution

The comparison is one change — who holds the loop — on the same model, the
same tasks and the same machine. What it shows is a direction and a floor,
not a rate:

| Suite | Arm | Passes | Turns | Failed checks | Tool errors | Peak input | Wall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| easy | primary agent (`bare`) | 1/3 | 19.7 | 0.7 | 2.0 | 2,980 | 179 s |
| easy | worker | 2/3 | 31.7 | 1.3 | 7.7 | 33,443 | 405 s |

Averages hide the shape: the worker's one failure was its most expensive
session (33,443 tokens, 4 failed checks), and its two passes cost 185 s and
405 s. The primary agent's pass cost 189 s and its failure 179 s. At n=3 the
difference is **one session**, which is why the page says direction and not
gap.

## Interpretation

The weakest badge is `screen`: one suite of one task, three sessions, one
machine, and the second sample of a contrast whose first sample pointed the
other way — the baseline had the primary agent at 0/9. Neither sample is a
rate.

Lesson 1 used to say that Mellum as the main agent passes 8 of 15 and that
the same model bounded passes 15. **That claim is retired.** It was oMLX
ladder rungs, it does not transfer, and this backend's samples do not
reproduce a gap of that size. What survives is the design argument — a
bounded worker returns control between tasks, and the primary agent's context
and failures are the operator's problem — and the medium suite's 2/3 against
0/3 in the baseline.

What would upgrade this: n larger than three, and a medium run on a machine
and deadline that let the suite finish. Medium fits 600 s on the M5 Max where
the baseline ran — Baseline Pi 0/3 at 359 s, Baseline Worker 2/3 at 204 s —
and does not on the M1 Pro, roughly 1.7–3× slower, where medium now runs with
`--deadline 1800`. Until then the honest sentence is "on easy, an unbounded Pi
sometimes finishes; on medium, the baseline's primary agent did not in nine
sessions".
