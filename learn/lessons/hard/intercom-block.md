---
title: The intercom block is a prefill tax
tier: hard
number: H2
time: 5 min read
track: lessons
position: 9
prerequisites: [getting-started/worker-extension]
authors: [Paul Everitt]
backends: [llamacpp]
---

# H2 · The intercom block is a prefill tax

A delegate's protocol text sent on every turn is context you pay for again on
every request, for a channel the parent may never open. The worker hands back one
summary block per finished span instead, built after the fact.

!!! abstract "Overview"

    **Questions**

    - Why not keep a delegate's whole transcript in the parent's context?

    **Objectives**

    - Explain why text re-sent on every request is a cost that grows with turns.
    - Recognise how `collapseHandoffs` replaces a closed span with one summary block.
    - Tell a rationale with no arm apart from a measured finding.

## Problem

**Badge:** `conjecture`

When a worker delegates, the framework has a choice about what the parent sees:
the child's transcript, kept in the parent's context, or a summary of it. Keeping
the transcript feels safer — the parent "sees everything" — but the parent's
context is re-sent on every subsequent request, so each read, edit and test run
is paid for again on every turn of the rest of the session.

pi-subagents shipped the extreme version of this: its intercom instructions
(a protocol for talking to the parent) rode in the child's prompt on every
request, whether or not the parent ever used the channel. That was a fixed tax
per request for a feature that might never be exercised.

## Eval case

**Badge:** `conjecture`

There is **no arm**, and the page says why: LC.8 retired the delegated child on
2026-10-20 — the agent template, the child-only guard loading, the Worker run
records, the skill's intercom phases and the ladder's `delegated` mode all went
with it. A measurement needs a mechanism that ships, and this one does not.

So this page is a rationale, not a finding. It rests on the removal and on what
replaced it, both of which are in the repository rather than in a run record.

## Evidence of the problem

**Badge:** `conjecture`

The evidence is the shape of the thing that was deleted. A block of protocol text
in the child's prompt is paid on **every** request of that child, and when the
parent keeps the transcript it is paid again on every request of the parent. The
cost is proportional to turns, not to how much of the transcript was needed.

An earlier record measured the intercom version of that tax and found the passes
unchanged while the prompt shrank. Its numbers are deliberately not repeated
here: the mechanism it measured no longer ships, and a percentage attached to a
deleted feature reads like a claim about today's worker.

The removal is the evidence, and it is checkable:

```bash
git log --oneline --grep="one worker" | head -3
```

## Solution

**Badge:** `conjecture`

Do not keep a delegate's transcript in the parent's context. Summarise the span
once, when it closes, and let the parent grow by one block per span instead of by
the whole session's transcript.

That is what `collapseHandoffs` in
[`extensions/mellum-worker.ts`](https://github.com/pauleveritt/mellum-worker/blob/main/extensions/mellum-worker.ts)
does: at the context event it replaces a closed span's messages with one handoff
message, built from the span's own rows — the task, the files it touched, files
that are missing at handoff, and the state of its last command. An open span is
left untouched.

### The code

The summary line is the part to read, because it is the whole budget argument:

```ts
function summaryLine(stats: SpanStats, factsSource?: string): string {
	const n = stats.requests;
	const wall = stats.wallSeconds === undefined ? "wall unknown" : `${stats.wallSeconds} s`;
	const last = { ok: "last command ok", failed: "last command failed", unfinished: "last command did not finish", none: "no commands" }[stats.lastCommand];
	return `Mellum: ${n} request${n === 1 ? "" : "s"}, ${stats.usage.output.toLocaleString("en-US")} output tokens, ${wall}, ${last}${factsSource ? `, facts: ${factsSource}` : ""}`;
}
```

One line, bounded, and it carries what a parent needs to decide what to do next.
The command list is capped at fifteen for the same reason: a summary that grows
without a bound is a transcript with extra steps.

## Validation

**Badge:** `conjecture`

### Evidence of the solution

No arm, so no before/after table. What can be checked today is that the block is
one block, that it is built from the span and not from the parent's turns, and
that an open span is left alone:

```bash
node --test tests/mellum-worker.test.mjs tests/mellum-worker-hooks.test.mjs
```

The handoff tests cover a finished span, an announce-and-stop span with a failed
last command, a span with no edits and nothing missing, and an open span that
must not be collapsed. They are the mechanism's contract; they are not a cost
measurement, and this page does not claim one.

### Checks

`node --test tests/mellum-worker.test.mjs tests/mellum-worker-hooks.test.mjs`
passes, and `npm test` runs the whole suite around it. A rationale that cannot
pass its own mechanism's tests would be arguing for code that no longer works.

## Interpretation

The weakest badge is `conjecture`, and it is the whole page: nothing here is
measured on this repository's worker, because the mechanism that made the
measurement interesting was removed.

What transfers is the rule, not the retired feature. **A delegate's work is
summarised after the fact; it is not re-sent every turn.** Context spent per turn
is a recurring cost, and a transcript is the shape of cost that grows with the
session rather than with the work. The same reasoning applies to any framework
that offers to keep a child's history in the parent's window.

What would upgrade this: re-add a delegate mechanism, give it an arm, and measure
the transcript against the summary on the suites — the pairing this page cannot
do for a feature that no longer exists. Until then, the honest reading is "do not
add this back unmeasured", which is also the rule the rest of this track follows.

### Run it yourself

There is no arm to run: the delegated child this page is about was removed, so it has no harness command, and the mechanism tests under Validation are the only thing to check.

!!! success "Key points"

    - This page is a rationale, not a finding: the whole page carries the `conjecture` badge.
    - Protocol text or a transcript sent on every request is paid again on every turn, whether or not it is used.
    - The worker summarises a closed span once, as one handoff block, and leaves an open span alone.
    - Do not add a delegate's transcript back unmeasured.
