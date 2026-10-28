---
title: One Spec File per Phase
tier: medium
number: M3
time: 7 min read · 120 min to run
track: lessons
position: 10
prerequisites: [getting-started/suite]
authors: [Paul Everitt]
backends: [llamacpp]
---

# M3 · One Spec File per Phase

A phased build given one joined spec leaves the worker guessing which phase it
was asked for, and the phase it drops is the last one. Written per phase, each
spec can be checked before the next arrives.

!!! abstract "Overview"

    **Questions**

    - Does splitting a phased build's spec into one file per phase stop the worker dropping the last phase?

    **Objectives**

    - Compare a `joined` and a `split` spec layout on Silver using the phase-4 `check_groups` reading.
    - Recognise a workspace that does not import by reading `checks_ran` before `failed_checks`.
    - Write acceptance criteria into the spec where the brief points.

![A small robot picking up the first of four cards laid out in a row](../../assets/illustrations/one-spec-per-phase.webp){ .illustration }

## Problem

**Badge:** `screen`

A four-phase build can carry its requirements as one `specs/roadmap.md` holding
every phase, or as one file per phase. The old claim was that the joined file
loses the last phase: the model cannot find the line that asks for it, so the
final id never lands. That claim came from ladder rungs that are retired, and it
does not reproduce here.

What this run produced instead is worse and more common: a workspace that no
longer imports. Twice in six sessions the worker finished having reported
success while the project could not be loaded: `SyntaxError: unterminated
triple-quoted string literal` in `app.py`, and a `Complaint` whose `timestamp`
had no default, so `models.py` could not seed itself. Nothing was checked in
either session, and both look identical to "every check failed" if you only read
the count.

## Eval case

**Badge:** `screen`

Silver, the second level of [The Challenge](../../challenge/index.md), as set up
in [Getting started](../../getting-started/suite.md): four phases
of an AgentClinic complaints app, graded by hidden pytest plus `ruff`,
`pyrefly` and `complexipy`. The arm is the *layout of the spec*, and nothing
else:

- `joined`: `specs/roadmap.md` holds all four phases, and `AGENTS.md` says so.
- `split`: `specs/roadmap.md` is gone; `specs/phase-1.md` … `phase-4.md` carry
  the same stories, each phase's brief points at its own file, and `AGENTS.md`
  says one file per phase.

Both arms send the same four thin briefs, byte-identical except the file they
name. Three sessions per arm on llama.cpp, `--deadline 2700`:

```bash
uv run learn/code/harness.py run --suite medium --arm worker \
  --specs joined --repeat 3 --grade --deadline 2700
```

| | |
| --- | --- |
| Machine | Apple M1 Pro, 8 cores, 32 GiB |
| Backend | `llama-server` 0.7.0, Mellum 2.1 `Q4_K_M`, `-c 50000` (`n_ctx` 50,176) |
| Sampling | `temperature 1`, `top_p 0.95`, `top_k 20`, `max_tokens 16384` |

The reading is not passes. Silver floors at 0/3 for every arm, so the reading is
`check_groups` in each run's `run.json` (how many of each phase's hidden checks
are missing) with the phase-4 group as the primary one, because the last phase
is where the old finding lived.

## Evidence of the problem

**Badge:** `screen`

Six sessions, no censors, no contamination, nothing written outside the layout
except once:

| Arm | Session | Phase 1/2/3/4 missing | Checks ran | Wall |
| --- | --- | --- | --- | --- |
| `joined` | `5d07a2` | 0 / 5 / 3 / **5** | yes | 1048 s |
| `joined` | `0eefd4` | 0 / 0 / 1 / **0** | yes | 1145 s |
| `joined` | `6e7fdb` | n/a | **no** | 1607 s |
| `split` | `995575` | 3 / 1 / 0 / **0** | yes | 1294 s |
| `split` | `b3eaae` | 0 / 4 / 3 / **3** | yes | 839 s |
| `split` | `29dbd6` | n/a | **no** | 1227 s |

Phase-4 missing is `joined` {5, 0} against `split` {0, 3}. The rule fixed before
the run (one arm separates only if *every* session of it misses strictly fewer
than every session of the other) sees 0 against 0 and stops. **This is a null.**

The two `n/a` rows are the pathology, not a measurement: `checks_ran: false` means
the hidden checks never executed because the workspace would not import. `joined`
`6e7fdb` left a syntax error; `split` `29dbd6` left a dataclass that cannot
construct with two arguments, so the module that seeds the board fails on import.
Read without that field, both are "18 of 18 checks failed", which is the wrong
finding and points at the wrong file.

`split` `995575` deserves its own line: it passed every phase-3 and phase-4
check while missing 3 of the 4 phase-1 checks. The later phases overwrote
`templates/base.html`'s conventions (doctype, `lang="en"`, nav) instead of
extending them. Cumulative checks catch that; a per-phase score would not.

## Solution

**Badge:** `screen`

The change that moved every session off the floor was not the layout: it was
writing the acceptance criteria into the spec, so a brief that points at a file
asks for what the hidden checks read. `specs/tech-stack.md` carries the layout:

```markdown
| `models.py` | The `Complaint` dataclass and the module-level `complaints` list |
```

and each phase in `specs/roadmap.md` carries an **Acceptance** list quoting what
its checks require:

```markdown
**Acceptance.**

- `GET /complaints` answers 200, contains the heading `Complaints Board`, and
  keeps the shared layout: doctype, `lang="en"`, brand and both nav links.
- Each complaint is a `.card` whose text carries the agent's name, the
  complaint text and a date showing year, month and day.
- `models.py` defines `Complaint(agent_name, text)`: both construct
  positionally, and each gets its own timezone-aware `timestamp` by default.
```

In the `split` arm those lists live in `specs/phase-N.md`; in the `joined` arm
they sit in the one roadmap. Before they existed, the same briefs produced
sessions where no check could run at all, because nothing had asked for
`models.py`; the prompts had, and the briefs were pointing at the spec.

## Validation

**Badge:** `screen`

### Evidence of the solution

| Arm | Session | Missing of 18 | Phase 4 missing | Requests | Wall |
| --- | --- | --- | --- | --- | --- |
| `joined` | `0eefd4` | **1** | 0 | 79 | 1145 s |
| `joined` | `5d07a2` | 13 | 5 | 62 | 1048 s |
| `split` | `995575` | 4 | 0 | 88 | 1294 s |
| `split` | `b3eaae` | 10 | 3 | 62 | 839 s |

Every number here is in [the run record](https://github.com/pauleveritt/mellum-worker/blob/main/docs/superpowers/research/2026-10-25-lesson10-run.md),
with the preregistration, the two excluded sessions and the rule as it was
written before the run; the six sessions' `run.json` and traces are in the
[`research-2026-10-25`](https://github.com/pauleveritt/mellum-worker/releases/tag/research-2026-10-25)
release.

### Quality and budget

Quality is the column that moved: from a workspace no check could open, to four
sessions missing 1, 4, 10 and 13 of 18. Budget moved with it (62–88 requests and
839–1294 s) and no nudge fired in any session, so the guard was not what carried
them. Passes stayed at 0/3 for both arms, which is why the pass column is not the
claim.

The layout did not separate: `joined` {5, 0} against `split` {0, 3} on the
phase-4 group, and {13, 1} against {4, 10} on the total. Four usable sessions,
two per arm, is not a comparison to build a rule on, and the difference between
them is smaller than the difference between sessions of the same arm.

### Checks

`uv run python learn/code/harness.py qualify --suite medium` → `known-good: PASS`,
`known-broken: FAIL`, `medium: QUALIFIED`. `learn/code/tests` 62/62, `npm test`
368/368, `docs-caps` 4/4.

## Interpretation

The weakest badge is `screen`, and it is the whole page: one machine, one
backend, n = 3 per arm with two usable sessions in each.

The claim this lesson used to carry (a one-file roadmap misses the last phase's
id in 5 of 6 runs) rested on ladder rungs and is **retired**. Nothing here
reproduces it: the last phase came back clean in one session of each arm, and the
sessions that lost it lost the whole workspace instead.

What survives is narrower and more useful. **Write the criteria where the brief
points, and write them per phase.** A spec that names the files, the markup and
each phase's acceptance is what got a 12B worker from "nothing imports" to one
missing check; the number of files it is spread across did not separate anything
at this n. And read `checks_ran` before reading `failed_checks`: a workspace that
does not import reports a full set of missing checks, and the two are not the
same finding.

What would upgrade this: n above 3 per arm on a task that is above the pass
floor, so the layout question gets the sample it needs. Until then the layout is
an open question on this page, not an answer either way.

### Run it yourself

Run each layout on Silver, three sessions per arm, with the page's deadline:

```bash
uv run python learn/code/harness.py run --suite medium --arm worker \
  --specs joined --repeat 3 --grade --deadline 2700
uv run python learn/code/harness.py run --suite medium --arm worker \
  --specs split --repeat 3 --grade --deadline 2700
```

!!! success "Key points"

    - The layout did not separate at n = 3 per arm: phase-4 missing was {5, 0} against {0, 3}, a null.
    - The old claim that a joined roadmap misses the last phase's id is retired; nothing here reproduces it.
    - Writing per-phase acceptance criteria where the brief points moved every usable session off the floor.
    - Read `checks_ran` before `failed_checks`: a workspace that does not import reports every check missing.
