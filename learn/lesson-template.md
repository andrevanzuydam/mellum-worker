# Lesson title

```yaml
---
title: The worker decides when it is done
track: lessons          # getting-started | lessons
position: 2             # recommended order within the track
prerequisites: [getting-started/harness]
authors: [Andre van Zuydam, Paul Everitt]
backends: [omlx, mlx-lm] # where the badged evidence ran; llama.cpp once re-run
---
```

## Problem

**Badge:** `conjecture` ([badges](about/evidence.md#badges))

Describe what a small model does wrong, in one paragraph a learner can recognize from their own runs.

## Eval case

**Badge:** `conjecture` ([badges](about/evidence.md#badges))

Name the rung or task that reproduces the problem, and how it is scored, with a link to the code.

## Evidence of the problem

**Badge:** `conjecture` ([badges](about/evidence.md#badges))

Show the runs that demonstrate the problem, with sample size and backend.

## Solution

**Badge:** `conjecture` ([badges](about/evidence.md#badges))

Describe the change that was tried, with a link to the commit or file.

## Validation

**Badge:** `conjecture` ([badges](about/evidence.md#badges))

Run the test suite and the static analysis that show the change holds (`ruff`, `pyrefly`, and one complexity tool). Show the command and what it said. A negative result is still a result.

## Interpretation

A short narrative covering:

- What the evidence means, naming the weakest badge among steps 1–5 that the conclusion relies on.
- Which backend the evidence came from when it differs from the learner's (llama.cpp).
- What is still open: the run that would upgrade the weakest badge, or the question the evidence cannot answer.
- No new numbers. All data belongs in steps 1–5.
