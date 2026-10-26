---
title: Project facts
track: lessons
position: 5
prerequisites: [getting-started/worker-extension]
authors: [Paul Everitt]
backends: [llamacpp]
---

# Project facts

A small model dropped into a workspace has to infer how the project is built,
and a plausible guess survives several turns. The worker appends a short,
switchable block of project facts to every request, and this run found no pass
moved.

## Problem

**Badge:** `screen`

A small model dropped into a workspace has to infer how the project is built:
which command runs the tests, which interpreter, what it may not touch. It
usually guesses, and the guess is plausible enough to survive several turns.

Project facts are the small answer: a bounded block of bullets from
`AGENTS.md` that the worker appends to every request it forwards. The question
this page asks is whether the block that ships changes anything.

## Eval case

**Badge:** `screen`

The easy suite from [Getting started](../getting-started/suite.md), one
prompt, graded by hidden pytest plus `ruff`, `pyrefly` and `complexipy`. Three
sessions per arm on llama.cpp, one change between them:

- `worker` — prompt v5, seven tools, guards on, facts on.
- `no-facts` — the same with `MELLUM_MODE_FACTS=0`, which makes
  [`extensions/mellum-facts.ts`](https://github.com/pauleveritt/mellum-worker/blob/main/extensions/mellum-facts.ts)
  return `source: "off"` and append nothing.

Backend `llama-server` 0.7.0 (build 11669), Mellum 2.1 `Q4_K_M`, `-c 50000`
(`n_ctx` 50,176), the learner's profile: `temperature 1`, `top_p 0.95`,
`top_k 20`, `max_tokens 16384`.

## Evidence of the problem

**Badge:** `screen`

A facts arm lives or dies on whether the block reaches the model, so the arm
counts requests carrying `Project facts:` before it counts passes:

| Arm | Session | Passed | Requests | Injected | Peak input | Tool errors |
| --- | --- | --- | --- | --- | --- | --- |
| `worker` | `9d5483` | **yes** | 26 | 26/26 | 857 | 5 |
| `worker` | `6e3209` | no | 22 | 22/22 | 13,813 | 2 |
| `worker` | `7009b6` | **invalid** | 11 | 11/11 | 19,721 | 1 |
| `no-facts` | `0f2dc0` | no | 17 | **0/17** | 857 | 2 |
| `no-facts` | `e3136d` | no | 48 | **0/48** | 880 | 17 |
| `no-facts` | `64c6ec` | no | 51 | **0/51** | 758 | 11 |

`7009b6` is excluded: the grader was touched during the run, so the worker is
**1 of 2 valid sessions**, not 1 of 3.

The counts do what the arm needs — every worker request carries the block, no
`no-facts` request does — so the arm is neither void nor thin. It simply found
no difference in passes: 1/2 against 0/3, one valid session apart.

## Solution

**Badge:** `screen`

Ship the block, keep it small, and make it switchable. What the worker
forwarded in those sessions:

```
Project facts:
- Test command: uv run --frozen python -m pytest tests
- Run Python commands with uv run --frozen.
- Use existing dependencies and test configuration.
- Keep changes scoped to the task; do not weaken existing tests.
- Before reporting completion, run the test command and report its result.
- Do not: start servers
```

Six bullets, capped at 600 characters, from the first `## Mellum` section of
`AGENTS.md`, with a detected test command when the section names none. The
last bullet is the one this page will come back to.

## Validation

**Badge:** `screen`

### Evidence of the solution

| Suite | Arm | Passes | Turns | Tool errors | Peak input | Wall |
| --- | --- | --- | --- | --- | --- | --- |
| easy | facts on (`worker`) | 1/2 | 24 | 3.5 | 19,721 | 316 s, 199 s |
| easy | facts off (`no-facts`) | 0/3 | 38.7 | 10.0 | 880 | 139–457 s |

### Quality and budget

Nothing separates the arms on passes at n=3, which is the result: **a null**.
The budget columns do not rescue it either. The facts-on arm spent *more*
peak context, not less, and its sessions were slower; the facts-off arm made
more tool errors and hit the deadline in all three sessions.

### The lead the arm found

All three `no-facts` sessions ended the same way: a foreground server command,
a `tool_call` with no `tool_result` after it, then silence until the harness
killed the child at 600 s.

| Session | Last command | Silence before the kill |
| --- | --- | --- |
| `0f2dc0` | `uv run uvicorn app:app --reload --port 8001` | 460 s |
| `e3136d` | `uvicorn app:app --reload --port 8001` | 200 s |
| `64c6ec` | `uv run --offline python app.py` | 143 s |

The bullet they did not receive is `- Do not: start servers`. The same day's
`worker` sessions reach for servers too — `pip install uvicorn`,
`python -c "import uvicorn"`, and one `python app.py > app.log 2>&1 &` — and
none of them ended a run, and the one that started the app backgrounded it.
So the axis is not "servers" but "foreground and never returns".

**This is a lead, not a finding.** One difference, n=3, on a machine whose
walls drifted during the day. It is also not this page's idea: the pathology
is Andre's, index P2 "The server that never returns", and it is deferred to
the Pathologies page behind his consent.

## Interpretation

The weakest badge is `screen`: one suite of one task, three sessions, one
machine, and a null. Project facts did not change what the easy suite passed
here.

The claim this page used to carry — a 600-character facts section taking a
four-phase build from 1/12 to 9/12 — came from a different instrument on a
different backend and is retired. What replaces it is narrower and more
useful: the block provably reaches the model on every request, and on this
backend it is not what moves a pass rate.

What would upgrade this: a task where the test command is genuinely unknown
(the suites all ship one), and an arm whose reading is hung tool calls rather
than passes — the foreground-server question above, which needs its own
preregistration and belongs to the Pathologies page.
