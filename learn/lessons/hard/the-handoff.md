---
title: The Handoff
tier: hard
number: H2
time: 3 min read
track: lessons
position: 1
prerequisites: [lessons/hard/who-drives]
authors: [Paul Everitt, Andre van Zuydam]
backends: [llamacpp]
---

# H2 · The Handoff

Once a driver hands work to a worker, it has to decide what it gets back. The
whole transcript is paid for again on every later request; one summary block,
written when the span closes, is paid for once.

!!! abstract "Overview"

    **Questions**

    - Why not keep a delegate's whole transcript in the parent's context?
    - What should a handoff carry instead?

    **Objectives**

    - Explain why text re-sent on every request is a cost that grows with turns.
    - Read how `collapseHandoffs` replaces a closed span with one block.
    - Tell a rationale with no arm apart from a measured finding.

![Two robots buried in a growing paper tape, beside a single card passed by hand](../../assets/illustrations/the-handoff.webp){ .illustration }

## Problem

**Badge:** `conjecture`

The parent's context is re-sent on every request. Keep a child's transcript
in it and every read, edit and test run the child made is paid for again on
every turn for the rest of the session. pi-subagents shipped the extreme
version: its intercom protocol text rode in the child's prompt on every
request, whether or not the parent ever used the channel.

## Eval case

**Badge:** `conjecture`

**Before:** the transcript stays in the parent. **After:** one handoff block
per closed span. There is no arm for either: LC.8 retired the delegated child
on 2026-10-20, and the ladder's `delegated` mode went with it. A measurement
needs a mechanism that ships, so this page is a rationale, not a finding.

## Evidence of the problem

**Badge:** `conjecture`

The evidence is the shape of what was deleted. Protocol text in a child's
prompt is paid on every request of that child, and again on every request of
a parent that keeps the transcript: the cost follows turns, not need. An
earlier record measured the intercom tax; its numbers are not repeated,
because the mechanism no longer ships. The removal itself is checkable:
`git log --oneline --grep="one worker"`.

## Solution

**Badge:** `conjecture`

**Remedy unit:** none: the handoff block (`collapseHandoffs`) ships inside `extensions/mellum-worker.ts`, not as a unit.

**Lesson check:** not built yet. A small challenge of this lesson's own,
failing without the remedy and passing with it, is planned under LC.26; until
then the evidence below is the suites'.

At the context event, `collapseHandoffs` replaces a closed span's messages
with one handoff message built from the span's own rows: the task, the files
it touched, files missing at handoff, and the state of its last command. An
open span is left alone. The summary line is the budget argument in one line:

```ts
return `Mellum: ${n} request${n === 1 ? "" : "s"}, ${stats.usage.output.toLocaleString("en-US")} output tokens, ${wall}, ${last}${factsSource ? `, facts: ${factsSource}` : ""}`;
```

The command list is capped at fifteen for the same reason: a summary that
grows without a bound is a transcript with extra steps.

## Validation

**Badge:** `conjecture`

No arm, so no before and after. What can be checked is the contract: the
handoff tests cover a finished span, an announce-and-stop span with a failed
last command, a span with no edits and nothing missing, and an open span that
must not be collapsed. They are not a cost measurement, and this page claims
none.

## Interpretation

The weakest badge is `conjecture`, and it is the whole page. What transfers
is the rule: **summarise a delegate's work once, after the fact; do not
re-send it every turn.** The flow in the next lessons follows it: each phase
gets a short forward context (a north star, what is already built, the last
phase), never the earlier phases' transcripts. What would upgrade this: a
delegate mechanism with an arm, transcript against summary, on
[The Challenge](../../challenge/index.md).

### Run it yourself

There is no arm to run; check the mechanism's contract:

```bash
node --test tests/mellum-worker.test.mjs tests/mellum-worker-hooks.test.mjs
```

!!! success "Key points"

    - A transcript kept in the parent is paid again on every turn, whether or not it is read.
    - The worker hands back one block per closed span and leaves an open span alone.
    - This page is a rationale with no arm; do not add a transcript back unmeasured.
