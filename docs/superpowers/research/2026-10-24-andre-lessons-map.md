# Andre's LESSONS.md and THEORIES.md: source map

Date: 2026-10-24. Status: mapping, not a lesson set.

Sources, read at PR #1 head `618b0a0`:

- [LESSONS.md](https://github.com/pauleveritt/mellum-worker/blob/618b0a0ecd1df9ff7a6ddff3da9b4f9a44a9a1af/LESSONS.md)
- [THEORIES.md](https://github.com/pauleveritt/mellum-worker/blob/618b0a0ecd1df9ff7a6ddff3da9b4f9a44a9a1af/THEORIES.md)

`LESSONS.md` is 100 compressed lessons plus dated addenda. It is a **log**,
not a curriculum. `THEORIES.md` is a staging table of falsifiable claims, not
evidence. Use both to map work; do not copy either into the Learning Center.

## Lesson ranges

| LESSONS.md | What it covers | Use here |
| --- | --- | --- |
| 1–58 | Tool-calling format, content-call shim, parser, local servers | Engineering notes; not Learning Center lessons |
| 59–64 | Ladder, freeze-the-oracle, validate the oracle, raw evidence | Mediated-test lesson and harness practice |
| 65–72 | One prompt source, redispatch, temperature/seed, effort ramp, timeout, relay, real failure text | Prompt ledger, Flow/examine, harness |
| 73–76 | Retry-signal bug, porting mechanisms | Harness telemetry; not a standalone lesson |
| 77–85 | Reproducing behavior, diagnostics, honest reporting | Telemetry and Interpretation guidance |
| 86–94 | Process and hygiene | Repo practice, not learner lessons |
| 95–100 | Patterns from a working local-model harness | Backlog; some map to context/tools |

## Prompt versions

| Version | LESSONS.md mapping | Destination |
| --- | --- | --- |
| v5 | Current `main`; prompt source discipline (65) | Baseline Worker / short-prompt lesson |
| v6 | Keep existing tests (61, 63) | Fold into test-preservation / write-only pathology |
| v7 | 60–62, 66; mediation addendum | “The mediated test clears the hard rungs” |
| v8 | Mediation addendum: test subset / narrowing | “The worker moves its own goalposts” |
| v9 | Mediation addendum: spec subset | “Implement the whole spec” |
| v10 | Mediation addendum: foreground server | New “The server that never returns” |
| v11 | Mediation addendum: self-check | New “The rule it knew and skipped” |

The addendum at lines 379–444 is the most directly usable source: it states
the v8/v9/v11 pathologies, the remedies, and the measured lift. It is more
current than the numbered lessons and should be cited by section, not by
number alone.

## Flow/examine

| LESSONS.md addendum | What it maps to |
| --- | --- |
| “breaking the ceiling” (2026-10-23) | Flow/examine: argument-free tools, decomposition, best-of-N, examiner, live lookup, visibility |
| “spec-driven examine” (2026-10-23) | INT.2: examiner, phase gates, flow ladder mode |
| “the harness as a habit formula” | Intermediate rationale: habits raise effective capability but have a ceiling |

The “spec-driven examine” addendum separates **proven** from **theory**:
rung 6 pass, Flint/Mellum parity, output-cap truncation, write-list false FAIL,
same-instrument measurement; then examine-once/cap thrash and full hard suite
are explicitly unmeasured. Preserve that split.

## THEORIES.md

| Theory | Status | Use |
| --- | --- | --- |
| T8 mediated test rescues rungs 4/5 | marked untested, but the mediation addendum has later evidence | Update the status before citing; then map to mediated lesson |
| T7 NCM gate cannot supply capability | screening | Defer; needs gate × model-size run |
| T1–T6 context ordering, recency, retrieval, cache, rethink, vision/files | untested | Backlog; not lessons |
| T8/T7 and the Flow addenda | not a curriculum | Candidate screens; promote only after a test |

## What not to do

- Do not turn 100 lessons into 100 Learning Center pages. Most are engineering
  practice, server details or process notes.
- Do not treat `THEORIES.md` as evidence. It says `untested` or `screening`.
- Do not copy the addenda wholesale; extract the transferable pathology and
  cite the source section.
- Do not let the prompt-version history become the lesson sequence. The lesson
  is the pathology; the version is the arm.
