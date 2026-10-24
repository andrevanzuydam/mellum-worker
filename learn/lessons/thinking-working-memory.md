---
title: Thinking is working memory
track: lessons
position: 3
prerequisites: [getting-started/worker-extension]
authors: [Paul Everitt]
backends: [omlx]
---

# Thinking is working memory

## Problem

**Badge:** `cited`

Stripping earlier turns' thinking out of each request looks like a free cut
in prefill, the input the server reads before it generates. The old
reasoning is not the current task, so why send it? But a small model uses
its own reasoning as working memory: the plan it made two tool calls ago is
what keeps it from starting over.

## Eval case

**Badge:** `cited`

Ladder rungs 1–5, fifteen runs each, oMLX.
[A3](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/ablation-a3-v4b/README.md)
is the reference: prompt v5 in replace mode, the shipped nudge and loop
breaker, and thinking left in the history.
[A12](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/ablation-a12-strip-thinking/README.md)
repeats A3's settings with `ladder/strip-thinking.js`, a
`before_provider_request` handler that removes `reasoning_content` from
every assistant message in the outgoing payload. That one change is the arm.

## Evidence of the problem

**Badge:** `cited`

A3 passed 15/15 at 54 s per run. A12 passed 14/15 at 87 s. Prefill fell
57% (308k to 133k characters per run), but output tokens rose 73% (5,344 to
9,270). Nudges rose from 2 to 6, and one final was still empty. The run got
cheaper to send and more expensive to finish.

## Solution

**Badge:** `cited`

Keep `reasoning_content` in the history. A hook may rewrite the system
prompt and the messages after the mode marker, but it should leave the
model's earlier reasoning alone. The shipped worker already does this; the
extension records the reason in its header comment. The session keeps the
whole history either way, so the hook is where the mistake would be made.

### The code

From [`extensions/mellum-worker.ts`](https://github.com/pauleveritt/mellum-worker/blob/main/extensions/mellum-worker.ts#L20-L25),
lines 20–25:

```ts
 * While on, before_provider_request rewrites the outgoing payload: the system message
 * becomes the worker prompt (prompts/mellum-worker.md, or $MELLUM_MODE_PROMPT), and the
 * messages are only those after the on-marker, minus Superpowers' bootstrap message.
 * Earlier turns' reasoning_content is left in place: removing it made runs 60% slower
 * (ladder A12). The session keeps everything; after /mellum off the parent is sent one
 * handoff block per finished span (task, files touched, last command output, final reply)
```

## Validation

**Badge:** `cited`

### Evidence of the solution

The two arms use the same rungs, backend and settings except for the strip.
A12's reading also notes that oMLX's prefill is 86% cache hits.

| Arm | Passes | Prefill (k chars/run) | Output tokens/run | Wall (s/run) | Nudges | Empty finals |
| --- | --- | --- | --- | --- | --- | --- |
| A3, thinking kept | 15/15 | 308 | 5,344 | 54 | 2 | 0 |
| A12, thinking stripped | 14/15 | 133 | 9,270 | 87 | 6 | 1 |

This is oMLX, and n is the record's fifteen runs per arm. Wall is the
record's mean, which the record marks untrusted.

### What the telemetry shows

The prefill column carries the saving; the output-token, nudge and
empty-final columns carry the cost. A12 made fewer requests but generated
much more, and one run still ended without a final answer.

## Interpretation

The weakest badge is `cited`: oMLX, fifteen runs, one machine. That
cache-hit share is why the saving is illusory. Most of the prefill A12
removed was already cached, so sending less of it bought little, while the
model re-derived its plan in output tokens that cost real seconds. For a
locally served small model, context is the cheap side when the prefix is
stable; generation is the expensive side.

What would upgrade this: the same A3 and A12 arms on llama.cpp, where the KV
cache and prefix reuse differ. That re-run is still open; until it lands,
treat the result as a shape to recognise, not a rate to copy.
