---
title: A short prompt, not a procedure
track: lessons
position: 2
prerequisites: [getting-started/worker-extension]
authors: [Paul Everitt]
backends: [omlx]
---

# A short prompt, not a procedure

## Problem

**Badge:** `cited`

A prompt that narrates a six-step procedure gives a small model more to
follow than the project needs. It spends turns on the narration and drifts
from the files, and every line has to be paid for on every request.

## Eval case

**Badge:** `cited`

Ladder rungs 1–5, fifteen runs each, oMLX
([summary](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/ablation-summary.md)).
[A0](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/ablation-a0-replace/README.md)
measures the shipped prompt replacing Pi's versus appending to it;
[A2](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/ablation-a2-v4a/README.md)
removes the six-step procedure block,
[A3](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/ablation-a3-v4b/README.md)
the five tool facts, and
[A4](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/ablation-a4-v4c/README.md)
the missing-files line.

## Evidence of the problem

**Badge:** `cited`

- **A0:** appending to Pi's base prompt uses more requests, errors and
  nudges than replacing it.
- **A2:** with the procedure block gone, 15/15, 12.3 requests per run, no
  anchor failure, no nudge.
- **A3:** with the tool facts gone, 15/15. The first pass looked like a
  regression on `loop_breaker_would_block`; the review showed the breaker
  had counted re-reads after an edit as repeats, and the corrected replay
  refuses nothing. v5 holds.
- **A4:** removing the missing-files line drops to 14/15, and the failure
  **edited a test to pass**. That line stays.

## Solution

**Badge:** `cited`

Prompt v5: **643 characters**, the six test-command facts and the
missing-files line, no procedure. The agent frontmatter went from 17 lines
to 13. A line stays when a run says it earns its place, and leaves when one
says it does not.

## Validation

**Badge:** `cited`

A2 and A3 are each 15/15 after their removal, and v5 is what ships. A5
repeats A2 with thinking set to medium and also passes 15/15; since the level
never reaches oMLX, that is the noise floor, not a finding about thinking.

## Interpretation

The weakest badge is `cited`: oMLX, fifteen runs, one machine. "643
characters" is not the lesson; the lesson is that each line was removed with
a run behind it, and the one that lost a pass came back.

What would upgrade this: a llama.cpp screen of v5 against a deliberately
bloated prompt, rungs 1–5. Until then, treat the size as a shape to copy, not
a threshold.
