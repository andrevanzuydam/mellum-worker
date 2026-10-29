---
title: Read the Failure
tier: easy
number: E2
time: 4 min read · 20 min to run
track: lessons
position: 1
prerequisites: [lessons/easy/the-ditch]
authors: [Paul Everitt, Andre van Zuydam]
backends: [vllm]
---

# E2 · Read the Failure

Before you fix anything, find out what actually went wrong. A failed session
almost always shows one recognisable pathology in its trace, and each one has
a remedy in the list the other lessons work through.

!!! abstract "Overview"

    **Questions**

    - What does a small model do wrong when it gets the job with no help?
    - How do I tell which failure it was, from the trace and the record?

    **Objectives**

    - Run bare Pi on Bronze and read its `run.json` and trace.
    - Name the failure: a stall, a missing module, an empty turn, a loop.
    - Find that failure's row in the remedies list and the lesson that fixes it.

![A small robot with a magnifying glass reading a long paper trace on the floor](../../assets/illustrations/read-the-failure.webp){ .illustration }

## Problem

**Badge:** `screen`

You ran a session and it failed. The score alone does not tell you why, and
guessing leads to remedies that fix nothing. Every later lesson adds one
remedy for one named failure, so the first skill is naming it.

## Eval case

**Badge:** `screen`

Bronze, the first level of [The Challenge](../../challenge/index.md), with
bare Pi: no extensions, only the recorder. Nothing is added; this lesson's
before and after are the same run, read twice.

## Evidence of the problem

**Badge:** `screen`

Nine bare sessions on the vLLM host (Bronze, Silver and Gold, n = 3 each,
2026-10-29). Three passed. The six failures, by what the record shows:

| What the record shows | Sessions | The failure |
| --- | --- | --- |
| `stalled` names `python app.py` or `uvicorn …` | 4 (3 of them failed) | a server started in the foreground hung the session |
| `checks_ran: false` without a stall (one wrote `main.py`) | 2 | the hidden checks import a module that was never created |
| `empty_finals: 1` and 21 `tool_errors` | 1 | it kept retrying failing calls, then ended a turn with nothing |

A session can show more than one; read them in the order below.

## Solution

**Badge:** `screen`

**Remedy unit:** none. This lesson adds nothing; it teaches the reading the
others depend on.

**Lesson check:** not built yet. A small challenge of this lesson's own,
failing without the remedy and passing with it, is planned; until
then the evidence below is the suites'.

Read a failed session in this order:

1. `run.json`: `passed`, then `checks_ran` (did the checks even run?), then
   `stalled` (which command hung?), `empty_finals` and `tool_errors`.
2. `trace.jsonl`: the last few tool calls before the end. The failure is
   almost always there.
3. The [remedies list](../index.md#pathologies-and-their-remedies): find the
   row whose pathology matches, and go to its lesson.

## Validation

**Badge:** `screen`

Each failure in the table above has a row in the remedies list: the
foreground server is E6, the empty turn is M4, a loop is E3. The missing
module has no unit; it is what the task-shaping lessons (M9, M10) address.

## Interpretation

The weakest badge is `screen`: nine sessions on one host — though the
foreground-server stall also showed on a second, the 2026-10-29 local 6-bit MLX
lessons smoke
([record](https://github.com/andrevanzuydam/mellum-worker/blob/main/docs/ladder/2026-10-29-local-lessons-smoke/README.md)).
What transfers is the habit, not the counts: read `checks_ran` and `stalled` before
`failed_checks`, because a session whose checks never ran reports every
check missing for a reason that has nothing to do with the checks.

### Run it yourself

```bash
uv run python learn/code/harness.py run --suite easy --repeat 3 --grade
```

!!! success "Key points"

    - Name the failure before you fix it: read `checks_ran` and `stalled` first, then the trace's last calls.
    - On this host, bare Pi's most common failure was a foreground server hanging the session.
    - Every failure you name has a row in the remedies list, and a lesson that adds one remedy for it.
