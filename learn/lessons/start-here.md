---
title: Start Here
number: S0
time: 3 min read · 1 min to run
track: lessons
position: 0
prerequisites: [getting-started/suite]
authors: [Andre van Zuydam]
backends: [none]
---

# S0 · Start Here

This lesson teaches how every other lesson works, by being one: a before run
that fails, a change, and an after run that passes. It needs no model and no
GPU, because a stand-in plays the model, so both runs finish in seconds.

!!! abstract "Overview"

    **Questions**

    - What do a lesson's before and after mean, and how do I run them?
    - How do I read whether a run passed, and why it failed?

    **Objectives**

    - Run a before line and an after line, and read FAIL then PASS.
    - Find the reason for a failure in the result, then in `run.json`.
    - Switch a remedy on by hand with `/remedy`.

![A small robot reading an open map beside a row of stepping stones leading away](../assets/illustrations/start-here.webp){ .illustration }

## Problem

**Badge:** `conjecture`

Every lesson names one thing a small model gets wrong and shows one change
that fixes it. To trust the fix you have to see both states, with and without
it, and read the result yourself. Here the "model" writes `add(a, b)` as
`a - b`, so the hidden test fails.

## Eval case

**Badge:** `conjecture`

**Before:** a stand-in for the model that writes the wrong answer
(`fake-pi-wrong.sh`). **After:** a stand-in that writes the right one
(`fake-pi.sh`). Both run the same small task through the real harness and
its hidden grader. In every other lesson, before and after differ by one
`--remedy` unit and the model is real; nothing else changes.

## Evidence of the problem

**Badge:** `conjecture`

Run the before line (in `/lesson`, press `r` on this step's Eval case). The
result reads `FAIL`, one line per session, with the reason: here, "the
hidden tests failed". Each session also leaves a `run.json`: `passed`,
`checks_ran`, `stalled` and `missing_checks` say what happened, in that
order of importance. Lesson E1 teaches reading them in full. No arm has run,
so there is no n to report.

## Solution

**Badge:** `conjecture`

**Remedy unit:** none: in this lesson the change is the stand-in itself; every
other lesson names a unit from the remedies list.

**Lesson check:** not built yet. A small challenge of this lesson's own,
failing without the remedy and passing with it, is planned under LC.26; until
then the evidence below is the suites'.

Real lessons apply their remedy in one of two ways, and you can use both:

1. **On the command line:** the after line adds `--remedy <unit>`, as every
   lesson's Run it yourself shows.
2. **By hand, in Pi:** type `/remedy` to pick a unit, or
   `/remedy on guard/break-repeat-loops`, and the next tool call in your
   session is covered by it. `/remedy off …` takes it away again.

## Validation

**Badge:** `conjecture`

Run the after line (`r` on the Solution step). The result reads `PASS`. One
session is a demonstration; a lesson's real test, its lesson check, runs each
line at a preregistered n and must fail every session before and pass after.
No arm has run, so there is no n to report.

## Interpretation

That is the whole loop every lesson repeats: name the failure, run before,
add one change, run after, and read the record rather than the model's own
claim of success. The only differences later are a real model, a real task,
and a real remedy, so the runs take minutes instead of seconds.

### Run it yourself

Before, then after:

```bash
uv run python learn/code/harness.py run --suites-dir learn/code/tests/fixtures/suites --suite add --pi-binary learn/code/tests/fixtures/fake-pi-wrong.sh --repeat 1 --grade
uv run python learn/code/harness.py run --suites-dir learn/code/tests/fixtures/suites --suite add --pi-binary learn/code/tests/fixtures/fake-pi.sh --repeat 1 --grade
```

!!! success "Key points"

    - Every lesson shows two states of one command: before, and after one change.
    - Read the result line first, then `run.json`: `passed`, `checks_ran`, `stalled`, `missing_checks`.
    - Apply a remedy with `--remedy` on the command line, or `/remedy on` by hand in Pi.
