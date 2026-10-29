---
title: Know When to Stop
tier: easy
number: E6
time: 3 min read · not built yet
track: lessons
position: 6
prerequisites: [lessons/easy/too-many-tools]
authors: [Andre van Zuydam]
backends: [vllm]
---

# E6 · Know When to Stop

Pi has no turn cap, so a small model that cannot finish keeps calling tools until the deadline. One guard sets a budget and asks for a summary when it runs out.

!!! abstract "Overview"

    **Questions**

    - What does a session do when the task has a part it cannot meet?
    - Why is a summary of what was not done worth more than a deadline?

    **Objectives**

    - Run a task with an impossible requirement and see the session run to its deadline.
    - Add `guard/cap-turns` and see it stop with a summary that names what it could not do.

![Know When to Stop: a placeholder picture until this lesson has its own](../../assets/illustrations/know-when-to-stop.webp){ .illustration }

## Problem

**Badge:** `conjecture`

Pi gives the model no turn budget. Handed a task with one requirement it cannot meet, a small model keeps trying, call after call, until the deadline ends the session with nothing said about what is missing.

## Eval case

**Badge:** `conjecture`

Not built yet. This lesson's own challenge, `learn/challenges/know-when-to-stop/`, is
planned under the uniform-lessons plan; its before and after lines arrive
with it.

## Evidence of the problem

**Badge:** `conjecture`

None yet: no arm has run on this lesson's challenge, so there is no n to
report.

## Solution

**Badge:** `conjecture`

**Remedy unit:** `guard/cap-turns`; apply it with `--remedy guard/cap-turns`.

**Lesson check:** not built yet.

## Validation

**Badge:** `conjecture`

Not run. The lesson check will run the before and after lines on the 6-bit
reference model and record the result here.

## Interpretation

The weakest badge is `conjecture`: this page names a failure and its remedy,
and nothing has been measured yet. Read it as the plan for a lesson, not as a
lesson.

### Run it yourself

The before line, until the challenge and its after line exist:

```bash
uv run python learn/code/harness.py run --suites-dir learn/challenges --suite know-when-to-stop --remedy guard/break-repeat-loops,guard/stay-in-workspace,guard/refuse-whole-file-rewrite,guard/block-foreground-server,context/narrow-tools --repeat 3
```

!!! success "Key points"

    - Pi has no turn cap; a session that cannot finish runs to its deadline.
    - `guard/cap-turns` blocks calls past a budget and asks for a summary.
    - This lesson's challenge and check are not built yet.
