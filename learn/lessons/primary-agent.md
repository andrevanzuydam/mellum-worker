---
title: The primary agent is the wrong worker
track: lessons
position: 1
prerequisites: [getting-started/worker-extension]
authors: [Paul Everitt]
backends: [llamacpp]
---

# The primary agent is the wrong worker

## Problem

**Badge:** `screen`

Give Mellum the whole job — the plan, the tools, the decision that it is
done — and on the easy suite it sometimes finishes and sometimes does not,
and the same is true of the bounded worker. The difference between them is
smaller than the claim this page used to make.

The idea is still the right one: what changes is who holds the plan and who
decides the work is finished. What the numbers will not support, on this
backend, is a large gap.

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

Do not make the model the main agent. Give it one task, seven file tools, a
test command and a stop condition; keep the plan, the context and the
checking outside.

That is what `/mellum` does in this center: the worker prompt replaces the
main prompt, the tools are narrowed, and the session comes back to you
between tasks. The extension is the vehicle; the bound is the point.

This half of the lesson is untouched by the measurement above. It is also the
half a learner can act on, which is why the page keeps it while retiring the
rate.

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

What would upgrade this: a medium run with a deadline that lets the suite
finish (today every medium session, both arms, was killed at 600 s), and n
larger than three. Until then the honest sentence is "on easy, an unbounded
Pi sometimes finishes; on medium, it did not in nine sessions".
