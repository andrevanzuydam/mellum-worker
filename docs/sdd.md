# Spec-driven development in this repository

The cycle: **brainstorm → spec → plan → execute → review/close.**

- Specs: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- Plans: `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`
- Research and verdicts: `docs/superpowers/research/YYYY-MM-DD-<topic>.md`

The M.1 design and plan were written in the weights repo, which may go private; `docs/recipe.md` summarizes them.
Everything after that lands here.

## Why this file exists

A written convention that nothing checks gets ignored under deadline
pressure. So: caps, and a checker. `tests/docs-caps.test.mjs` fails the suite
when a document is over cap; the caps are the ones below.

## Document caps

| Document | Cap | Over cap means |
| --- | --- | --- |
| `ROADMAP.md` whole file | 400 lines | Something owes a move to `research/` or deletion |
| Roadmap **Ships** or **Excludes** cell | 900 chars | A verdict doc is owed |
| Roadmap **Status** cell | 1,000 chars | A verdict doc is owed |
| **Backlog entry** | 1,200 chars | A research doc is owed; the entry keeps a link and a reopen condition |
| **Plan** | 400 lines, 25% fenced | Split the phase |
| **Spec** | 400 lines | Split the design |

Over cap does not mean "trim the wording". It means a verdict or research doc
is owed: move the narrative to `docs/superpowers/research/`, link it, and let
the entry shrink to a summary plus a reopen condition.

## `## Now` is a pointer, not a narrative

The roadmap's `## Now` is one short paragraph of pointers: the active phase,
what was last measured, where the record is. History goes in Status cells and
research docs.

## Backlog discipline

Every entry states a reopen condition. An entry over cap owes a research doc
and shrinks to a summary, a link, and its reopen condition. Resolved entries
are removed once their outcome is recorded in a phase row or a research doc
the row links. Cite entries by heading anchor, never by line number.

## Plan front matter

```
---
phase: M.1
cycle: 1
lifecycle: active
---
```

`lifecycle` is `active`, `closed`, or `superseded`. A closed plan ends with
`## Result` (date, what shipped, what was measured). At close, fences over 15
lines become `path:line` references.

## Archive

Closed and superseded plans move to `plans/archive/` and are never edited
afterwards. Specs and research are not archived.

## Research notes

Open with an honesty header stating plainly **What is measured** and **What
is conjecture**, and end with **What would falsify this** and **Risks**.
Evidence that is not text (transcripts, run records) goes in a sibling
`YYYY-MM-DD-<topic>/` directory.

## Standing rules

- Measured settings are not changed without a ladder run in `ladder/`,
  recorded in `docs/ladder/`; raw evidence goes in a `research-YYYY-MM-DD`
  release, never in git.
- Every new test is shown to fail before the code that makes it pass.
- A release is a tag; the package version, the tag, and the README install
  lines agree, and `CHANGELOG.md` has a section for it.
