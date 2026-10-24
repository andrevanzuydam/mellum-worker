---
title: Guards for empty turns and loops
track: lessons
position: 4
prerequisites: [getting-started/worker-extension]
authors: [Paul Everitt]
backends: [omlx]
---

# Guards for empty turns and loops

## Problem

**Badge:** `cited`

A small model sometimes ends a turn with nothing: `stop`, no text, no tool
call, part-way through the task. It sometimes also re-runs the same call
until the run spins. Nothing in the model's own loop notices either, so a
worker that only forwards turns stops early or burns the deadline.

## Eval case

**Badge:** `cited`

Ladder rungs 1–5, fifteen runs each, oMLX.
[A0](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/ablation-a0-replace/README.md)
is the reference with the guard extension loaded: the empty-final nudge and
the loop breaker, both bounded.
[A1](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/ablation-a1-noguards/README.md)
repeats it with the guard extension not loaded, so there is no nudge and no
loop breaker. That one change is the arm.

## Evidence of the problem

**Badge:** `cited`

A0 passed 15/15. A1 passed 13/15, and both failures are the empty turn the
nudge answers: rung 3 r2 ends after four requests with thinking that says
"First, edit rows.py" and no tool call, and rung 5 r3 ends after seventeen
with "We'll use edit tool again". In A1 nothing answers either turn, so the
run settles and is scored as a failure. The two rungs that lost a repeat are
exactly the two whose failure was an empty final; the other three rungs were
untouched.

## Solution

**Badge:** `cited`

Ship the two guards in the worker, child-only. The empty-final nudge looks
at the turn at `agent_before_settle`: if the assistant ended the turn itself
with no text and no tool call, the guard appends one message restating the
completion fact and asks for one more model request, at most three times per
run. The loop breaker (`createLoopBreaker`) refuses the next identical tool call after five
repeats with nothing changed in between; an edit, write or bash call clears
its memory, so a legitimate edit-and-test cycle never trips it. Both are
bounded, and the bounds are the ones recorded in
[phase 2b](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/phase2b-guards-bounded/README.md). The other
guards in the file stay dormant: their columns never went non-zero in direct
mode.

### The code

From [`extensions/mellum-guards.ts`](https://github.com/pauleveritt/mellum-worker/blob/73fadc8/extensions/mellum-guards.ts#L83-L93),
lines 83–93, with `NUDGE_TEXT` at lines 57–60:

```ts
export function createEmptyFinalNudge(max: number): (message: MessageLike) => Continuation | undefined {
	let used = 0;
	return (message) => {
		if (!isEmptyAssistantTurn(message) || used >= max) return undefined;
		used += 1;
		return {
			entries: [{ type: "custom_message", customType: "mellum-guard", content: NUDGE_TEXT, display: true }],
			continue: true,
		};
	};
}
```

`used >= max` is the whole bound: the guard is one counter and one custom
message, and it stops asking after the third. It also only acts on a turn
the model ended itself; `isEmptyAssistantTurn` returns false for an aborted
or errored turn, so the guard does not paper over a crash.

## Validation

**Badge:** `cited`

### Evidence of the solution

The two arms use the same rungs, backend and settings except for the guard
extension.

| rung | A0 (guards) | A1 (no guards) |
| --- | --- | --- |
| 1 | 3/3 | 3/3 |
| 2 | 3/3 | 3/3 |
| 3 | 3/3 | 2/3 |
| 4 | 3/3 | 3/3 |
| 5 | 3/3 | 2/3 |
| total | 15/15 | 13/15 |

| measure (15 runs) | A0 | A1 |
| --- | --- | --- |
| passes | 15/15 | 13/15 |
| requests per run, mean | 14.9 | 13.1 |
| tool errors | 17 | 10 |
| whole-file `write`s to an existing file | 11 | 4 |

This is oMLX, and n is the record's fifteen runs per arm. The record marks
wall seconds per run untrusted, so this page does not lean on them.

### Quality and budget

Quality moved on the passes column: A1 lost two rungs and no other rung
changed. The budget columns moved the other way, to fewer requests, fewer
tool errors and fewer whole-file writes, and the record reads that as the
shape of two removed recoveries rather than an improvement: those two runs
stopped after four and seventeen requests instead of finishing. The
difference is two runs in fifteen, and the record states it as a direction,
not a rate.

### Checks

The guards themselves are pinned by `tests/mellum-guards.test.mjs` under
`npm test`: the nudge fires only on an empty final, stops at the cap, and
leaves an aborted turn alone, while the loop breaker clears on an edit and
blocks the sixth identical call.

## Interpretation

The weakest badge is `cited`: one benchmark, oMLX, fifteen runs, one
machine. The arm also removes both guards at once, and only the empty-turn
failures show up in it, so the record supports the nudge on empty finals and
leaves the loop breaker's contribution unmeasured; no refusal fired in that
record. The narrow reading is that a guard which answers an empty final can
still hide a model that does not know it is done. The nudge restates the
completion fact and asks for one more request; it does not decide the task
is finished, and it spends a request each time it fires. So this is not
"guards make the model reliable". It is "the one residual pathology the
ladder recorded has an answer", and the answer is a bounded retry.

What would upgrade this: the same A1 arm on llama.cpp, where the sampling
and the server differ. That re-run is still open; until it lands, treat the
result as a shape to recognise, not a rate to copy.

### What to try next

A screen on a rung where the model plausibly stops early, counting how often
the nudge fires and how many of those runs go on to finish, would say how
much of a pass rate the guard is supplying rather than the model. The
quality risk is the opposite reading: a run that passes only after a nudge
restated the goal is not evidence that the model knows when it is done, so
such a screen has to report nudge fires beside passes and not merge them
into one number.

The other open item is the same A1 arm on llama.cpp, which is the run that
would upgrade the `cited` badge here.
