---
title: Steps, Not One Brief
tier: medium
number: M10
time: 5 min read · 100 min to run
track: lessons
position: 9
prerequisites: [lessons/medium/one-spec-per-phase]
authors: [Paul Everitt]
backends: [llamacpp]
---

# M10 · Steps, Not One Brief

A four-phase build handed over as one joined brief finished faster and cheaper,
and left a project the checks could not open in all three sessions. Sent as
steps, the same briefs produced a runnable project every time.

!!! abstract "Overview"

    **Questions**

    - Should a multi-phase build be sent as one brief or as one brief per phase?

    **Objectives**

    - Compare a stepped and a `--single-prompt` run of Silver.
    - Recognise a confident final message over a project the checks cannot import.
    - Separate an outcome the run measured from a mechanism it did not show.

![A small robot that stopped after the first page of a very long letter](../../assets/illustrations/prose-brief.webp){ .illustration }

## Problem

**Badge:** `screen`

Handed every phase at once, the worry is that the model answers the first
thing it read and calls that done. What happens is quieter: the session
finishes, sometimes with a confident "implemented, the test command exits 0",
over a project missing a file the checks import.

## Eval case

**Badge:** `screen`

**Before:** `--remedy preset:easy,context/add-project-facts,context/use-short-prompt,nudge/nudge-empty-turn,tool/background-long-commands,tool/lookup-library-docs,check/check-code-quality --specs split --single-prompt`,
which joins the suite's four briefs with blank lines and sends them once.
**After:** the same without `--single-prompt`, one brief per phase, the
harness default. The evidence below is Silver, three sessions per arm on
llama.cpp at `--deadline 2700`, recorded with `--arm worker --specs joined`,
before this track put `--specs split` ahead of it.

## Evidence of the problem

**Badge:** `screen`

**The one-brief arm never produced a project its checks could open**: 18 of
18 missing and `checks_ran: false` in all three sessions. Each failed its own
way, and none said so: two missed `models.py` (`ModuleNotFoundError`), one
left a file that does not parse. The most confident final message of the six
sat over one of the projects that would not import.

## Solution

**Badge:** `screen`

**Remedy unit:** none: task shaping. The remedy is sending phases as steps, the harness default, by leaving out `--single-prompt`; it is not an extension.

**Lesson check:** not built yet. A small challenge of this lesson's own, failing without the remedy and passing with it, is planned under LC.26; until then the evidence below is the suites'.

Send phases as steps. Two reasons, both from this run:

1. **A checkpoint per phase.** A stepped run can be checked before the next
   phase arrives; a one-brief run gets one grade at the end, or none.
2. **A project that loads.** Checks ran in every stepped session and in no
   one-brief session.

## Validation

**Badge:** `screen`

**Lesson check, 2026-10-29** (vLLM host, n = 3 per arm; [lesson check](https://github.com/andrevanzuydam/mellum-worker/blob/main/docs/superpowers/research/2026-10-29-lesson-check.md)): stepped passed 0 of 3 on Silver, one brief 0 of 3: both at zero, so it does not hold; the suite is above what either arm passes at n = 3.

The checks ran in **3 of 3** stepped sessions and **0 of 3** one-brief ones:
a presence claim about the workspace, not a pass rate. The joined shape was
cheaper in requests (16–49 against 67–95) and wall (421–1029 s against
990–1867 s), but peak context did not follow: one joined session peaked at
21,100 against the stepped arm's highest 11,683. Passes were 0 of 3 in both arms.

??? note "The full evidence"

    | Arm | Session | Missing of 18 | Checks ran | Requests | Peak input | Wall |
    | --- | --- | --- | --- | --- | --- | --- |
    | steps | `d534ce` | 11 | yes | 95 | 11,683 | 1867 s |
    | steps | `eda435` | 9 | yes | 81 | 9,084 | 1123 s |
    | steps | `df4046` | **1** | yes | 67 | 10,353 | 990 s |
    | one-brief | `5d9dfb` | 18 | **no** | 16 | 21,100 | 697 s |
    | one-brief | `705bdd` | 18 | **no** | 36 | 1,238 | 421 s |
    | one-brief | `a26728` | 18 | **no** | 49 | 3,213 | 1029 s |

    | Session | What was missing | The grader's error | What the model said |
    | --- | --- | --- | --- |
    | `5d9dfb` | `models.py`, `templates/` | `ModuleNotFoundError: No module named 'models'` | nothing, no final text |
    | `705bdd` | `models.py` | `ModuleNotFoundError: No module named 'models'` | "implemented. The test command … exits 0" |
    | `a26728` | `templates/`, a file that does not parse | `SyntaxError: unterminated string literal` | nothing, no final text |

    Machine: Apple M1 Pro, 8 cores, 32 GiB; `llama-server` 0.7.0 (build
    11669), Mellum 2.1 `Q4_K_M`, `-c 50000` (`n_ctx` 50,176);
    `temperature 1`, `top_p 0.95`, `top_k 20`, `max_tokens 16384`; deadline
    2,700 s, twice this machine's slowest recorded Silver session. Wall seconds
    do not transfer between machines; peak token counts do.
    `qualify --suite medium` → `known-good: PASS`, `known-broken: FAIL`,
    `medium: QUALIFIED`; `learn/code/tests` 64/64, `npm test` 387/387.

## Interpretation

The weakest badge is `screen`: six sessions, one machine, one task family. The
older claim (a one-prompt brief loses four passes, and stepping costs 2.4× the
time) is retired, and so is an n = 1 screen, one session per arm, that had the
one-brief arm passing;
three sessions per arm reverse it. Why the joined brief fails is still a
conjecture; "stops at its first reply" is not what the traces show. What would
upgrade this: a one-brief session whose checks run, and a second task family.

### Run it yourself

Before, then after:

```bash
uv run python learn/code/harness.py run --suite medium --remedy preset:easy,context/add-project-facts,context/use-short-prompt,nudge/nudge-empty-turn,tool/background-long-commands,tool/lookup-library-docs,check/check-code-quality --specs split --single-prompt --repeat 3 --grade --deadline 2700
uv run python learn/code/harness.py run --suite medium --remedy preset:easy,context/add-project-facts,context/use-short-prompt,nudge/nudge-empty-turn,tool/background-long-commands,tool/lookup-library-docs,check/check-code-quality --specs split --repeat 3 --grade --deadline 2700
```

!!! success "Key points"

    - Checks ran in 3 of 3 stepped sessions and 0 of 3 one-brief sessions; a presence claim, not a pass rate.
    - The joined brief was cheaper in requests and wall, but not in peak context.
    - Passes were 0 of 3 in both arms, so nothing separates them on passes.
    - Why the one-brief arm fails is still a conjecture; this is a screen at n = 3 per arm.
