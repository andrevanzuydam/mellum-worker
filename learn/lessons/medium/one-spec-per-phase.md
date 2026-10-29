---
title: One Spec per Phase
tier: medium
number: M8
time: 5 min read · 120 min to run
track: lessons
position: 7
prerequisites: [lessons/medium/check-before-finishing]
authors: [Paul Everitt]
backends: [llamacpp]
---

# M8 · One Spec per Phase

A phased build can carry its requirements in one joined spec or one file per
phase; the worry is that joined loses the last phase. This lesson changes only
the layout and teaches what did move: each phase's acceptance criteria, written
where the brief points.

!!! abstract "Overview"

    **Questions**

    - Does one spec file per phase stop the worker dropping the last phase?
    - What actually moved a session off the floor?

    **Objectives**

    - Compare `--specs joined` and `--specs split` on Silver, reading phase-4 `check_groups`.
    - Read `checks_ran` before `failed_checks` to spot a workspace that does not import.
    - Write acceptance criteria into the spec the brief points at.

![A small robot picking up the first of four cards laid out in a row](../../assets/illustrations/one-spec-per-phase.webp){ .illustration }

## Problem

**Badge:** `screen`

A four-phase build given one `specs/roadmap.md` has to find which part of it
each brief asks for. The old claim was that the last phase gets lost. It came
from retired ladder rungs and does not reproduce here; what this run showed
instead is a workspace that no longer imports.

## Eval case

**Badge:** `screen`

**Before:** `--remedy preset:easy,context/add-project-facts,context/use-short-prompt,nudge/nudge-empty-turn,tool/background-long-commands,tool/lookup-library-docs,check/check-code-quality --specs joined`.
**After:** the same with `--specs split`. Silver, four phases of a complaints
app; both arms send the same four briefs, byte-identical except the file they
name. The evidence below is three sessions per arm on llama.cpp, recorded with
`--arm worker`, at `--deadline 2700`. Silver floors at 0/3, so the reading is
the phase-4 group of `check_groups`, not passes.

## Evidence of the problem

**Badge:** `screen`

Two of six sessions finished while the project could not load: `joined`
`6e7fdb` left `SyntaxError: unterminated triple-quoted string literal` in
`app.py`, and `split` `29dbd6` left a `Complaint` whose `timestamp` had no
default, so `models.py` failed on import. Both show `checks_ran: false`. Read
without that field, each is "18 of 18 checks failed", the wrong finding
pointing at the wrong file.

## Solution

**Badge:** `screen`

**Remedy unit:** none: task shaping. The remedy is the brief's layout, `--specs split`, a harness flag, not an extension.

**Lesson check:** not built yet. A small challenge of this lesson's own, failing without the remedy and passing with it, is planned under LC.26; until then the evidence below is the suites'.

Split the spec per phase, and, what actually moved every usable session off
the floor, write each phase's **Acceptance** list into the file the brief
points at:

```markdown
- `models.py` defines `Complaint(agent_name, text)`: both construct
  positionally, and each gets its own timezone-aware `timestamp` by default.
```

Before those lists existed, no check could run at all: the prompts asked for
`models.py`, but the briefs pointed the worker at a spec that never did.

## Validation

**Badge:** `screen`

**The layout is a null.** Phase-4 missing was `joined` {5, 0} against `split`
{0, 3}; the rule fixed before the run (every session of one arm strictly below
every session of the other) sees 0 against 0 and stops. Totals were {13, 1}
against {4, 10} of 18. Passes stayed at 0/3 in both arms, and no nudge fired.

??? note "The full evidence"

    | Arm | Session | Phase 1/2/3/4 missing | Checks ran | Wall |
    | --- | --- | --- | --- | --- |
    | `joined` | `5d07a2` | 0 / 5 / 3 / **5** | yes | 1048 s |
    | `joined` | `0eefd4` | 0 / 0 / 1 / **0** | yes | 1145 s |
    | `joined` | `6e7fdb` | n/a | **no** | 1607 s |
    | `split` | `995575` | 3 / 1 / 0 / **0** | yes | 1294 s |
    | `split` | `b3eaae` | 0 / 4 / 3 / **3** | yes | 839 s |
    | `split` | `29dbd6` | n/a | **no** | 1227 s |

    | Arm | Session | Missing of 18 | Phase 4 missing | Requests | Wall |
    | --- | --- | --- | --- | --- | --- |
    | `joined` | `0eefd4` | **1** | 0 | 79 | 1145 s |
    | `joined` | `5d07a2` | 13 | 5 | 62 | 1048 s |
    | `split` | `995575` | 4 | 0 | 88 | 1294 s |
    | `split` | `b3eaae` | 10 | 3 | 62 | 839 s |

    `split` `995575` passed every phase-3 and phase-4 check while missing 3 of
    the 4 phase-1 checks: later phases overwrote `templates/base.html`'s
    conventions instead of extending them. Machine: Apple M1 Pro, 8 cores,
    32 GiB; `llama-server` 0.7.0, Mellum 2.1 `Q4_K_M`, `-c 50000` (`n_ctx`
    50,176); `temperature 1`, `top_p 0.95`, `top_k 20`, `max_tokens 16384`.
    `qualify --suite medium` → `known-good: PASS`, `known-broken: FAIL`,
    `medium: QUALIFIED`; `learn/code/tests` 62/62, `npm test` 368/368,
    `docs-caps` 4/4. The preregistration and rule are in
    [the run record](https://github.com/andrevanzuydam/mellum-worker/blob/main/docs/superpowers/research/2026-10-25-lesson10-run.md);
    the `run.json` files and traces are in the
    [`research-2026-10-25`](https://github.com/pauleveritt/mellum-worker/releases/tag/research-2026-10-25)
    release.

## Interpretation

The weakest badge is `screen`: one machine, n = 3 per arm, two usable sessions
in each. The older claim (a one-file roadmap misses the last phase's id in 5 of
6 runs) is retired. What holds: write the criteria where the brief points, and
read `checks_ran` before `failed_checks`. What would upgrade this: more than
three sessions per arm on a task above the pass floor.

### Run it yourself

Before, then after:

```bash
uv run python learn/code/harness.py run --suite medium --arm bare --remedy preset:easy,context/add-project-facts,context/use-short-prompt,nudge/nudge-empty-turn,tool/background-long-commands,tool/lookup-library-docs,check/check-code-quality --specs joined --repeat 3 --grade --deadline 2700
uv run python learn/code/harness.py run --suite medium --arm bare --remedy preset:easy,context/add-project-facts,context/use-short-prompt,nudge/nudge-empty-turn,tool/background-long-commands,tool/lookup-library-docs,check/check-code-quality --specs split --repeat 3 --grade --deadline 2700
```

!!! success "Key points"

    - The layout did not separate at n = 3: phase-4 missing was {5, 0} against {0, 3}, a null.
    - Per-phase acceptance criteria where the brief points moved every usable session off the floor.
    - Read `checks_ran` before `failed_checks`: a workspace that does not import reports every check missing.
    - The old "joined roadmap loses the last phase" claim is retired.
