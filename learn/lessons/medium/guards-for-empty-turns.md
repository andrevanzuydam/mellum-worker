---
title: Guards for Empty Turns and Loops
tier: medium
number: M2
time: 5 min read · 60 min to run
track: lessons
position: 4
prerequisites: [getting-started/worker-extension]
authors: [Paul Everitt]
backends: [llamacpp]
---

# M2 · Guards for Empty Turns and Loops

A small model can end a turn having said nothing and called no tool, and the
run stops there. The shipped guards answer that empty turn and repetition, and
the arms here show the nudge never fired rather than that it worked.

!!! abstract "Overview"

    **Questions**

    - What does the worker do when the model ends a turn having said nothing?
    - Do the guards actually fire on Bronze?

    **Objectives**

    - Describe how the empty-final nudge is bounded in code.
    - Recognise which empty finals the nudge answers (`stop`) and which it does not (`error`, `length`).
    - Read the `Nudges` fire count before the pass count when judging a guard arm.

![A small robot with an empty speech bubble being tapped on the shoulder by a guard](../../assets/illustrations/guards-for-empty-turns.webp){ .illustration }

## Problem

**Badge:** `screen`

A small model sometimes ends a turn having said nothing and called no tool:
an empty turn. Nothing is wrong with the request, the model is simply not
finished, and without help the run stops there. The shipped worker answers it
with a bounded nudge (one message, at most three times) and it answers
repetition with a loop breaker.

## Eval case

**Badge:** `screen`

Bronze, the first level of [The Challenge](../../challenge/index.md), as set up
in [Getting started](../../getting-started/suite.md): one prompt, graded by hidden pytest plus `ruff`, `pyrefly` and `complexipy`.
Three sessions per arm on llama.cpp, and the arm is the guard:

- `worker`: prompt v5, seven tools, nudge on, loop breaker on.
- `no-nudge`: the same, with `MELLUM_GUARDS={"loopBreaker":true}`.

An arm is only an arm if the guard it removes *fires*. The reading that
decides whether these guards are load-bearing is the fire count, not the
pass count, so the harness records `Nudges` beside the passes.

## Evidence of the problem

**Badge:** `screen`

**The nudge never fired.** In ten Bronze sessions the count was zero in both
arms. Every empty final in that sample had a reason the guard is not built to
answer:

| Sessions | Empty final ended by | Guard's condition |
| --- | --- | --- |
| most | `error`: a 51,697-token request against a 50,176-token window | `stop` only |
| most | `length`: the output cap spent | `stop` only |
| none | `stop` with nothing said | the case it answers |

`isEmptyAssistantTurn` continues only a turn the model ended itself with
`stop`. An aborted turn is deliberately not ours to continue, and a capped
turn never matched. So on Bronze the guard was not idle because the
arms behaved well; it was idle because **no empty turn had the shape it
answers**.

The follow-up arms agree. A later Bronze pairing recorded zero nudge fires
across nine sessions in three arms, and one apparent fire on Silver
turned out to be a counting bug: Silver runs four prompts as four Pi
processes, and the harness counted the empty final that ended one prompt as
continued by the next prompt's request. One test now pins each side.

## Solution

**Badge:** `screen`

Ship both guards and bound the nudge. The nudge's whole bound is one counter
and one custom message, and it stops asking after the third:

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

`used >= max` is the bound. The loop breaker is the other half and is not
exercised by any arm here. Both live in
[`extensions/mellum-guards.ts`](https://github.com/pauleveritt/mellum-worker/blob/176922f/extensions/mellum-guards.ts#L83-L93),
and that file is the source this excerpt is copied from.

## Validation

**Badge:** `screen`

### Evidence of the solution

| Run | Arm | Passes | Turns, mean | Tool errors, mean | Nudge fires |
| --- | --- | --- | --- | --- | --- |
| guard screen, Bronze, n=5 | `worker` | 2/5 | 32.6 | 4.2 | **0** |
| guard screen, Bronze, n=5 | `no-nudge` | 3/5 | 34.6 | 4.6 | **0** |

Two arms that never differ in behaviour cannot be compared, so this table is
**void for its question**, not a null: the 2/5 against 3/5 is one policy
scoring differently in two samples of one task.

### Quality and budget

Nothing here supports a pass-rate claim for either guard, and the page makes
none. What the arms did establish is where the guard does *not* reach: an
`error` final is a context overflow and a `length` final is an output cap, and
both are budgets, not lapses. That is the useful output of a void arm.

## Interpretation

The weakest badge is `screen`, and this page is weaker than its predecessors
in a specific way: it has no evidence that either guard lifts a pass on this
backend. The number it used to quote (13/15 to 15/15) came from oMLX rungs
and is retired here.

What survives is the mechanism and its bound, both visible in the code above,
and a sharpened problem statement: an empty turn has several causes and the
nudge answers exactly one. What the guards are worth is still open.

What would upgrade this: a task on which an empty final carries `stop` (the
Gold level's longer builds are the candidate) with the `Nudges` column as the
reading, and a deadline long enough for that suite to finish. Until then the
loop breaker's share is unmeasured and the nudge's is zero-fired.

### Run it yourself

The guard screen ran both arms on Bronze with the harness's default deadline, five sessions each:

```bash
uv run python learn/code/harness.py run --suite easy --arm worker --repeat 5 --grade
uv run python learn/code/harness.py run --suite easy --arm no-nudge --repeat 5 --grade
```

!!! success "Key points"

    - The nudge never fired on Bronze: zero fires in both arms.
    - The empty finals there ended by `error` (context overflow) or `length` (output cap), which the nudge is not built to answer.
    - The 2/5 against 3/5 table is void for its question, not a null; the old 13/15 to 15/15 number is retired.
    - What the guards are worth on this backend is still open; Gold is the candidate to test it.
