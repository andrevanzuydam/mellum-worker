---
title: The suite baseline
track: lessons
position: 0
prerequisites: [getting-started/suite]
authors: [Paul Everitt]
backends: [llamacpp]
---

# The suite baseline

## Problem

**Badge:** `screen`

With Mellum as the main model, Baseline Pi passes none of the nine suite
sessions; the Baseline Worker passes three, all on easy and medium. Hard passes
none for either. The direction is the old primary-agent result, but the suite
baseline is much weaker than the rung-1–5 ladder.

## Eval case

**Badge:** `screen`

Easy, medium and hard, three sessions per suite and arm. Easy is one prompt,
medium four and hard eleven. The Baseline Worker is `extensions/mellum-worker.ts`
with the worker prompt, seven built-in tools, the empty-final nudge, the loop
breaker and project facts. Baseline Pi is the same model with no extension.

## Evidence of the problem

**Badge:** `screen`

Baseline Pi, n = 3:

| Suite | Passes | Turns | Failed checks | Tool errors | Context | Wall | Output tokens |
| --- | --- | --- | --- | --- | --- | --- | --- |
| easy | 0/3 | 15.0 | 4.0 | 3.0 | 2355.7 | 22.1 | 2931.7 |
| medium | 0/3 | 54.3 | 18.0 | 5.7 | 15128.0 | 359.2 | 33197.0 |
| hard | 0/3 | 84.7 | 29.7 | 12.0 | 25828.0 | 569.1 | 46542.3 |

Baseline Pi is not one failure repeated: easy fails quickly, medium and hard spend
minutes and still miss the hidden checks.

## Solution

**Badge:** `screen`

Give the model the worker boundary: the worker prompt, the seven tools, the
guards and the project facts.

### The code

The wrapper is the invocation:

```bash
learn/code/clinic "/mellum <task>"
```

This is the Baseline Worker. The parts were screened by removing them one
at a time; the screen did not support lessons for them.

## Validation

**Badge:** `screen`

### Evidence of the solution

n = 3, same suites, same machine, llama.cpp:

| Suite | Arm | Passes | Turns | Failed checks | Tool errors | Context | Wall | Output tokens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| easy | Baseline Pi | 0/3 | 15.0 | 4.0 | 3.0 | 2355.7 | 22.1 | 2931.7 |
| easy | Baseline Worker | 1/3 | 26.7 | 2.0 | 4.0 | 7834.0 | 78.6 | 8978.3 |
| medium | Baseline Pi | 0/3 | 54.3 | 18.0 | 5.7 | 15128.0 | 359.2 | 33197.0 |
| medium | Baseline Worker | 2/3 | 47.7 | 6.0 | 5.7 | 7421.7 | 204.1 | 22507.7 |
| hard | Baseline Pi | 0/3 | 84.7 | 29.7 | 12.0 | 25828.0 | 569.1 | 46542.3 |
| hard | Baseline Worker | 0/3 | 108.3 | 20.7 | 17.0 | 17157.7 | 540.8 | 49524.0 |

### What the telemetry shows

The Baseline Worker separates on easy and medium by passes (0/3 to 1/3 and
0/3 to 2/3), and cuts failed checks on both. It does not separate on hard: no
arm passes and the worker spends more turns and tool errors while still
failing. The worker's context is lower on every suite, so the gain is not
from seeing more.

An earlier screen removed the prompt, the empty-final nudge and the loop
breaker one at a time. The prompt and loop did not separate; removing the
nudge was a lead (3/3 easy against 1/3), not a rate. The parts are therefore
not separate lessons. The [screen](https://github.com/pauleveritt/mellum-worker/blob/main/docs/superpowers/research/2026-10-21-basic-remedies-runs.md)
keeps the null result; the Baseline Worker is the unit.

### Checks

Both suites are qualified: `known-good` passes and `known-broken` fails. The
run JSON, not the final reply, carries the table. Static grading is not part
of this comparison.

## Interpretation

The weakest badge is `screen`: one backend, one model, one machine, n = 3. The
parent here is also Mellum, so this isolates the worker role, not what a large
parent gains. Hard has no headroom, and the Baseline Worker is not a remedy
there. What transfers is the shape: the worker boundary helps on easy and
medium; the component screen did not justify separate lessons.
