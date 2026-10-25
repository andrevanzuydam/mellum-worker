---
title: Thinking is working memory
track: lessons
position: 3
prerequisites: [getting-started/worker-extension]
authors: [Paul Everitt]
backends: [llamacpp]
---

# Thinking is working memory

## Problem

**Badge:** `screen`

A reasoning model writes before it answers, and the worker forwards those
blocks back to the model on the next request. Stripping them is the obvious
saving: the payload gets smaller and the prefill gets cheaper. The chapter
this page used to tell is that the saving is an illusion — you pay again in
output tokens, and sometimes in passes.

On llama.cpp that story currently has **no arm**. It is kept here because the
mechanism matters and because the page is the honest place to say so.

## Eval case

**Badge:** `conjecture`

There is no supported way to strip thinking on this backend today. The arm
that measured it before was a request-layer middleware in the ladder, which
rewrote outgoing payloads; the suites harness launches `pi` directly and has
no such seam. The settings the worker does expose — prompt, guards, facts —
say nothing about thinking, and `llama-server` is served with thinking on.

So the eval case this page wants is: the easy and medium suites, three
sessions each, `worker` against `worker` with every prior assistant
`reasoning` block removed from the forwarded context. It has not been run, and
an arm_settings entry alone cannot express it.

## Evidence of the problem

**Badge:** `screen`

What is measurable here is narrower: **thinking spends the output budget.** A
one-turn smoke against the running server, `max_tokens 32`, returned
`content: ''` with 32 completion tokens spent and `finish_reason: stop` — the
whole allowance went to reasoning. At `max_tokens 200` the same prompt
returned its reasoning and then `ready`.

The suites show the same budget being hit in anger: the failing runs in this
cycle's records include finals ended by `length`, the output cap, on both easy
and medium. An output cap spent on reasoning is a run that never reached its
answer, and no guard of this worker's shape can answer it.

None of that measures the saving from *keeping* thinking. It measures the
cost of the budget it draws on.

## Solution

**Badge:** `screen`

Keep the thinking blocks. Three reasons, in the order they matter:

1. The cap is the budget that binds: at `max_tokens 16384`, a run that spends
   its allowance reasoning ends empty, and stripping earlier thinking does not
   give that allowance back.
2. The extensions that need them read them — the loop breaker judges
   repetition from what the model said, and the nudge continues a turn it
   ended.
3. There is no measured case on this backend for removing them.

If a future arm shows stripping helps, this section changes. That is what the
page is waiting on.

## Validation

**Badge:** `conjecture`

### Evidence of the solution

| Suite | Arm | Passes | Peak input | Wall | Status |
| --- | --- | --- | --- | --- | --- |
| easy | `worker` | — | — | — | not run: no strip arm exists |
| medium | `worker` | — | — | — | not run: same |

A missing measurement is `—`, never `0`.

## Interpretation

The weakest badge is `conjecture`, and this page is deliberately thin: it
names a mechanism, a cost and a missing instrument. The numbers it used to
quote — a 57% prefill saving and a slower run — came from oMLX ladder arms and
are retired here rather than re-stated.

What survives is a testable shape: on this backend, prefill is cheap because
the layer cache absorbs the repeated prefix, so removing thinking from the
payload mostly moves cost from prefill into output. The suites can show that,
once the payload seam exists.

What would upgrade this: one instrument — a strip-thinking option in the
harness or the extension — and then the arm above, at n=3 on easy and medium.
Until it exists this page should be read as a question, not a finding.
