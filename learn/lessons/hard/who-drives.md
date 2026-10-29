---
title: Who Drives
tier: hard
number: H1
time: 4 min read · about 2 h to run
track: lessons
position: 0
prerequisites: [lessons/medium/steps-not-one-brief]
authors: [Paul Everitt, Andre van Zuydam]
backends: [llamacpp]
---

# H1 · Who Drives

Let the small model plan, pick its tools and decide it is finished, and its
failures arrive as yours. Put a driver above it, and the model gets one bounded task while the
plan and the verdict stay outside it.

!!! abstract "Overview"

    **Questions**

    - What changes when the model stops being the one in charge?
    - Did a bounded worker pass more sessions than Mellum as the primary agent?

    **Objectives**

    - Name the three decisions a driver takes away from the model.
    - Read a null pass count and a floor for what they do and do not show.
    - Compare the cost of failing, not only the pass count.

![A large robot juggling many tools beside a small robot focused on one task](../../assets/illustrations/who-drives.webp){ .illustration }

## Problem

**Badge:** `screen`

As the primary agent, Mellum owns the plan, the tool list and the word
"finished". Nothing outside it knows what done meant, so a missed phase, a
narrowed test or a hung server comes back as a confident final over work it
never checked, and the turns and the wall clock come back as your bill.

## Eval case

**Badge:** `screen`

**Before:** the model drives (`bare`: Pi with Mellum in charge and Pi's seven
file tools). **After:** a driver above it (`worker`: the operator sets one
task, the worker extension bounds the tools, the instructions and the finish,
and the hidden checks score the result afterwards). Bronze and Silver, three
sessions per arm, preregistered. These are the 2026-10-25 arms, measured
before the tiers existed; the tier's own before, `preset:medium`, has not been
run against them.

## Evidence of the problem

**Badge:** `reference-run`

Twelve sessions on an Apple M1 Pro (32 GiB, llama.cpp, `--deadline 2700`).
The pass counts were identical: Bronze 1/3 for each arm, Silver 0/3 for each,
so the rule reads **null on both suites**. Silver is a floor, not a tie: a
suite both arms fail every time cannot separate them. The baseline's Silver
sample (the worker at 2/3 against 0/3 on an M5 Max) did not reproduce.

How they failed did differ. Two of the three `bare` Bronze sessions ended on
the deadline, both after a foreground `uvicorn … --reload` that never
returned; `main.py` appeared outside the layout in two `bare` sessions. The
worker did neither.

## Solution

**Badge:** `screen`

**Remedy unit:** none: the driver is a role, the operator's or the harness's, not a unit; the measured comparison uses the `worker` arm.

**Lesson check:** not built yet. A small challenge of this lesson's own,
failing without the remedy and passing with it, is planned; until
then the evidence below is the suites'.

The model stays the same. What moves is which decisions its own text may make
(`extensions/mellum-worker.ts`):

1. **Which tools exist:** `pi.setActiveTools(WORKER_TOOLS)` narrows the set to
   `read`, `grep`, `find`, `ls`, `bash`, `edit` and `write`.
2. **What the instructions are:** `before_provider_request` replaces the system
   message with the worker prompt, whose last line defines done as "the test
   command exits 0".
3. **Whether the turn is finished:** `agent_before_settle` refuses an empty
   turn up to three times, and the loop breaker blocks a sixth identical call.

The plan stays with the driver (one task per dispatch), and the verdict is a
separate act: the hidden checks run after the model has stopped talking. The
rest of Hard makes that driver a harness, `learn/code/flow_run.py`.

## Validation

**Badge:** `reference-run`

**Lesson check, 2026-10-29** (vLLM host, n = 3 per arm; [lesson check](https://github.com/andrevanzuydam/mellum-worker/blob/main/docs/superpowers/research/2026-10-29-lesson-check.md)): the worker passed 3 of 3 on Bronze and 2 of 3 on Silver; bare Pi 2 of 3 on both: direction only on Bronze, a tie on Silver.

The bound did not buy a pass. It bought cheaper failures: no deadline burned,
nothing written outside the layout, and on Silver 2, 12 and 2 failed checks
against 18, 18 and 18. The one `bare` Bronze pass came from a session the
harness killed at the deadline, sitting on a server it could not stop, and
scored anyway.

??? note "The full evidence"

    | Suite | Arm | Passed | Failed checks | Requests | Tool errors | Peak input | Wall | Censored | Outside the layout |
    | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
    | Bronze | `bare` | 1/3 | 4, 4, 0 | 16, 13, 21 | 2, 2, 3 | 1,587 | 117, 70, 180 s | 2 | 2 |
    | Bronze | `worker` | 1/3 | 3, 0, 4 | 24, 37, 43 | 2, 7, 5 | 6,971 | 209, 291, 402 s | 0 | 0 |
    | Silver | `bare` | 0/3 | 18, 18, 18 | 45, 54, 60 | 3, 0, 9 | 11,508 | 827, 997, 1,051 s | 0 | 0 |
    | Silver | `worker` | 0/3 | 2, 12, 2 | 60, 26, 38 | 7, 1, 1 | 37,110 | 1,351, 587, 956 s | 0 | 0 |

    The record is
    [the 2026-10-25 lesson run](https://github.com/andrevanzuydam/mellum-worker/blob/main/docs/superpowers/research/2026-10-25-lesson1-run.md);
    its twelve run directories are in the
    [`research-2026-10-25`](https://github.com/pauleveritt/mellum-worker/releases/tag/research-2026-10-25)
    release. The guard fired zero times in this run, so what carried these
    sessions was the test command and the operator's scoring.

    Dated note, 2026-10-27: the Silver rows were measured before Silver's
    spec gained its acceptance criteria, its `models.py` layout and its own
    seeded test, and do not reproduce against today's fixture.

## Interpretation

The weakest badge is `screen`: one machine, one task per suite, n = 3. The
null is the finding. At this n a driver does not separate on passes; it
separates on how the session fails. What would upgrade it: a Silver task the
worker can pass, a larger n, and a second machine.

### Run it yourself

Before, then after, on Bronze and Silver:

```bash
for suite in easy medium; do
  for arm in bare worker; do
    uv run python learn/code/harness.py run --suite "$suite" --arm "$arm" --repeat 3 --grade --deadline 2700
  done
done
```

!!! success "Key points"

    - A driver takes three decisions from the model: the tools, the instructions and when it is finished.
    - At n = 3 the pass counts did not separate the arms: 1/3 each on Bronze, 0/3 each on Silver.
    - The bounded worker failed more cheaply: no deadline burned, nothing outside the layout, fewer failed checks on Silver.
