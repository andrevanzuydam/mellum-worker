---
title: Thinking Is Working Memory
tier: medium
number: M4
time: 4 min read · about 1 h to run
track: lessons
position: 3
prerequisites: [lessons/medium/guards-for-empty-turns]
authors: [Paul Everitt]
backends: [llamacpp]
---

# M4 · Thinking Is Working Memory

A reasoning model writes before it answers, and stripping that reasoning from
later requests looks like a cheaper prefill. The worker keeps it: the output
cap is the budget that binds, and the guards read what the model said.

!!! abstract "Overview"

    **Questions**

    - Does stripping earlier thinking from the forwarded context save anything?
    - Which budget does a reasoning model actually run out of?

    **Objectives**

    - Compare the `strip-thinking` and `worker` arms, which differ only in kept reasoning.
    - Recognise a final ended by `length` as an output cap spent on reasoning.
    - Name the run that would settle the question on this backend.

![A small robot with a thought bubble full of gears beside a jar filling with coins](../../assets/illustrations/thinking-working-memory.webp){ .illustration }

## Problem

**Badge:** `screen`

The worker forwards each earlier reasoning block back to the model on the next
request. Removing them shrinks the payload, so it looks like a saving. The
worry is that the saving is an illusion, paid back in output tokens and
perhaps in passes. On llama.cpp that has an instrument but **no result yet**.

## Eval case

**Badge:** `conjecture`

Keeping reasoning is a worker default, not a remedy unit, so this lesson's
before and after are the harness's two arms rather than a `--remedy` line.
**Before:** `--arm strip-thinking`, the worker with `MELLUM_STRIP_THINKING=1`.
**After:** `--arm worker`, which keeps every earlier block. Both arms carry
the facts, the short prompt and the nudge that M1 to M3 add. The run this page wants is Bronze and
Silver, three sessions each; it has not been run.

## Evidence of the problem

**Badge:** `screen`

What is measured is narrower: **thinking spends the output budget.** A
one-turn smoke at `max_tokens 32` returned `content: ''` with 32 completion
tokens spent and `finish_reason: stop`; at `max_tokens 200` the same prompt
returned its reasoning and then `ready`. The suites' failing runs include
finals ended by `length` on both Bronze and Silver: an output cap spent before
the answer.

## Solution

**Badge:** `screen`

**Remedy unit:** none: a default. Keeping earlier reasoning is what happens when nothing strips it; the opt-out is `MELLUM_STRIP_THINKING=1`, which `--arm strip-thinking` sets.

**Lesson check:** not built yet. A small challenge of this lesson's own, failing without the remedy and passing with it, is planned under LC.26; until then the evidence below is the suites'.

Keep the thinking blocks, for three reasons in order:

1. The cap binds: at `max_tokens 16384`, a turn that spends its allowance
   reasoning ends empty, and stripping earlier thinking does not give it back.
2. The extensions read them: the loop breaker judges repetition from what the
   model said, and the nudge continues a turn it ended.
3. There is no measured case on this backend for removing them.

## Validation

**Badge:** `conjecture`

**Lesson check, 2026-10-29** (vLLM host, n = 3 per arm; [lesson check](https://github.com/andrevanzuydam/mellum-worker/blob/main/docs/superpowers/research/2026-10-29-lesson-check.md)): keeping reasoning passed 2 of 3 on Bronze and 1 of 3 on Silver; stripping it passed 3 of 3 on both. It does not hold on this host, and points the other way from the oMLX ladder result; the backend's prefix caching may be why, and that is not measured.

### Evidence of the solution

Not measured as a lesson yet. Neither arm has a recorded Bronze or Silver
result, so every cell is `n/a`; a missing measurement is never `0`.

??? note "The full evidence"

    | Suite | Arm | Passes | Peak input | Wall | Status |
    | --- | --- | --- | --- | --- | --- |
    | Bronze | `worker` | n/a | n/a | n/a | not run yet |
    | Silver | `worker` | n/a | n/a | n/a | not run: same |

## Interpretation

The weakest badge is `conjecture`: a mechanism, a cost and an arm not yet run.
An older pair of numbers, a 57% prefill saving and a slower run, came from oMLX
ladder arms and is retired. The testable shape: on this backend the layer
cache absorbs the repeated prefix, so stripping mostly moves cost from prefill
into output. Read this page as a question until the two arms have run.

### Run it yourself

Before, then after (swap in `--suite medium --deadline 2700` for Silver):

```bash
uv run python learn/code/harness.py run --suite easy --arm strip-thinking --repeat 3 --grade
uv run python learn/code/harness.py run --suite easy --arm worker --repeat 3 --grade
```

!!! success "Key points"

    - Keeping reasoning is a worker default, so this lesson compares two arms, not a `--remedy` line.
    - Thinking spends the output budget: at `max_tokens 32` the whole allowance went to reasoning.
    - Keep the blocks; the guards read them and nothing measured here argues for removing them.
    - The badge is `conjecture`: read this page as a question, not a finding.
