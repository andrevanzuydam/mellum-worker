---
title: A prose brief stops at its first reply
tier: medium
number: M4
time: 6 min read · 100 min to run
track: lessons
position: 8
prerequisites: [getting-started/suite]
authors: [Paul Everitt]
backends: [llamacpp]
---

# M4 · A prose brief stops at its first reply

A four-phase build handed over as one joined brief finished faster and cheaper,
and left a project the checks could not open in all three sessions. Sent as
steps, the same briefs produced a runnable project every time.

!!! abstract "Overview"

    **Questions**

    - Should a multi-phase build be sent as one prose brief or as one brief per phase?

    **Objectives**

    - Compare a stepped and a `--single-prompt` run of the medium suite.
    - Recognise a confident final message over a project the checks cannot import.
    - Separate an outcome the run measured from a mechanism it did not show.

![A small robot that stopped after the first page of a very long letter](../../assets/illustrations/prose-brief.webp){ .illustration }

## Problem

**Badge:** `screen`

A multi-phase build can be handed to a worker two ways: as **steps** (one brief
per phase, each answered before the next arrives) or as **one prose brief** that
describes every phase at once and expects the model to work through them in
order.

The worry is that the second shape invites a first reply: the model answers the
first thing it read, calls that done, and never comes back for the rest. That is
not quite what happens. What happens is worse and quieter: the run finishes,
sometimes with a confident "implemented, the test command exits 0", over a
project that is missing a file the checks import.

## Eval case

**Badge:** `screen`

The medium suite from [Getting started](../../getting-started/suite.md): four
phases of a FastAPI complaints app, graded by hidden pytest plus `ruff`,
`pyrefly` and `complexipy`. The same four brief files, the same base, the same
grader, and one change between the arms:

- **steps**: the suite's four `prompts/*.md`, one request each.
- **one brief**: `--single-prompt`, which joins those same four files with
  blank lines and sends them once.

**Three sessions per arm**, because this page states a comparison and a screen
that states one needs n = 3. Three of the six sessions never ran their checks,
which is itself the finding.

| | |
| --- | --- |
| Machine | Apple M1 Pro, 8 cores, 32 GiB |
| Backend | `llama-server` 0.7.0 (build 11669), Mellum 2.1 `Q4_K_M`, `-c 50000` (`n_ctx` 50,176) |
| Sampling | `temperature 1`, `top_p 0.95`, `top_k 20`, `max_tokens 16384` |
| Deadline | 2,700 s, twice this machine's slowest recorded medium session |

The machine matters: the records this center started from were taken on an M5
Max, and **wall seconds do not transfer between machines**. Peak token counts
do.

## Evidence of the problem

**Badge:** `screen`

| Arm | Session | Missing of 18 | Checks ran | Requests | Peak input | Wall |
| --- | --- | --- | --- | --- | --- | --- |
| steps | `d534ce` | 11 | yes | 95 | 11,683 | 1867 s |
| steps | `eda435` | 9 | yes | 81 | 9,084 | 1123 s |
| steps | `df4046` | **1** | yes | 67 | 10,353 | 990 s |
| one-brief | `5d9dfb` | 18 | **no** | 16 | 21,100 | 697 s |
| one-brief | `705bdd` | 18 | **no** | 36 | 1,238 | 421 s |
| one-brief | `a26728` | 18 | **no** | 49 | 3,213 | 1029 s |

**The one-brief arm never produced a project its checks could open.** Each
session failed for its own reason, and none of them said so:

| Session | What was missing | The grader's error | What the model said |
| --- | --- | --- | --- |
| `5d9dfb` | `models.py`, `templates/` | `ModuleNotFoundError: No module named 'models'` | nothing, no final text |
| `705bdd` | `models.py` | `ModuleNotFoundError: No module named 'models'` | "implemented. The test command … exits 0" |
| `a26728` | `templates/`, a file that does not parse | `SyntaxError: unterminated string literal` | nothing, no final text |

The steps arm had bad sessions of its own (11 and 9 missing checks in two of
three, including 3 of 4 phase-1 checks lost in `d534ce`) but it always produced
something the checks could run.

An earlier version of this page reported one session per arm, in which the
one-brief arm passed and the stepped one failed on lint. That reading is
retired: at one session each it was an observation, and three sessions per arm
disagree with it.

## Solution

**Badge:** `screen`

Send phases as steps when the task has phases. That is what the Getting started
suite teaches and is the harness's default shape, and this run gives it two
reasons rather than one:

1. **A checkpoint per phase.** A stepped run can be checked before the next
   phase arrives; a one-brief run hands over everything and gets one grade at
   the end, or, as here, no grade at all.
2. **A project that loads.** Three of three one-brief sessions ended with a
   workspace missing a module the checks import. Whatever the joined brief does
   to the model's reading, its practical effect is an incomplete project.

The mechanism is still a conjecture. What is measured is the outcome: faster,
cheaper, and not runnable in any of three sessions.

## Validation

**Badge:** `screen`

### Evidence of the solution

| Arm | Sessions | Missing of 18 | Checks ran | Requests | Peak input | Wall |
| --- | --- | --- | --- | --- | --- | --- |
| steps | 3 | 11, 9, 1 | **3 of 3** | 67–95 | 9,084–11,683 | 990–1867 s |
| one-brief | 3 | 18, 18, 18 | **0 of 3** | 16–49 | 1,238–21,100 | 421–1029 s |

### Quality and budget

- **Quality:** checks ran in 3 of 3 stepped sessions and 0 of 3 joined ones. That
  is the claim, and it is a presence claim about the workspace, not a pass rate.
- **Budget:** the joined shape was cheaper in every session: fewer requests
  (16–49 against 67–95) and less wall (421–1029 s against 990–1867 s). **Peak
  context did not follow:** one joined session peaked at 21,100 against the
  stepped arm's highest 11,683, so the page does not claim a context saving.
- **Passes:** 0 of 3 in both arms, so nothing here separates them on passes.
  Medium is at a floor where both arms fail.

### Checks

`uv run python learn/code/harness.py qualify --suite medium` → `known-good:
PASS`, `known-broken: FAIL`, `medium: QUALIFIED`. `learn/code/tests` 64/64,
`npm test` 387/387.

## Interpretation

The weakest badge is `screen`, and it is the whole page: six sessions on one
machine, one backend, one task family, n = 3 per arm.

The claim this page used to carry (a one-prompt brief loses four passes, and
stepping it costs 2.4× the time) is **retired**, twice over. The n = 1 screen
that replaced it is retired too: it had the one-brief arm passing while the
stepped arm failed lint, and three sessions per arm reverse that.

What survives is the design advice, now with an outcome behind it. **Steps buy a
checkpoint per phase, and the joined shape produced nothing a check could open
in three of three sessions.** What does not survive is any claim about *why*:
"stops at its first reply" is a mechanism the trace does not show: one session
had no final text at all, and the most confident of the six sat over a project
that would not import.

Two things this page now shares with [Pathologies](../../pathologies.md): *builds
it somewhere else* and *leaves it unimportable* are the failure modes it
actually recorded, at three of three and twice respectively.

What would upgrade this: a one-brief session whose checks run, which would break
the shape claim; and a second task family, because six sessions of one suite on
one machine can only say what happened here.

### Run it yourself

Run the stepped arm and the one-brief arm on the medium suite, three sessions each, with the page's 2,700 s deadline:

```bash
uv run python learn/code/harness.py run --suite medium --specs joined --arm worker \
  --repeat 3 --grade --deadline 2700
uv run python learn/code/harness.py run --suite medium --specs joined --arm worker \
  --single-prompt --repeat 3 --grade --deadline 2700
```

!!! success "Key points"

    - Checks ran in 3 of 3 stepped sessions and 0 of 3 one-brief sessions; it is a presence claim, not a pass rate.
    - The joined shape was cheaper in requests and wall, but not in peak context.
    - Passes were 0 of 3 in both arms, so nothing separates them on passes.
    - Why the one-brief arm fails is still a conjecture; this is a screen at n = 3 per arm.
