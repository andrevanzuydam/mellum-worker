---
name: mellum-dev
description: Use when developing in the mellum-worker repository — writing or editing specs, plans, research, the prompt, templates, extensions, the skill, the ladder, docs, or tests, and when committing, closing a phase, or cutting a release. Enforces the project's Superpowers SDD workflow, its document caps, test-first discipline, measured-settings rule, changelog discipline, and the worker-exit lead. Reflects AGENTS.md and docs/sdd.md, which are authoritative; this skill is the procedure, not new policy.
---

# mellum-dev — how we work in this repo

`AGENTS.md` and [`docs/sdd.md`](../../../docs/sdd.md) are the source of truth.
This skill operationalizes them; where it and those files disagree, they win.
Read `AGENTS.md` first. Nothing here changes policy.

## 1. Spec-driven development (the cycle)

brainstorm → spec → plan → execute → review/close. Before writing any spec,
plan, or roadmap edit, read `docs/sdd.md`. Placement:
- Specs: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` — only when
  **product behavior** changes.
- Plans: `docs/superpowers/plans/YYYY-MM-DD-<topic>.md` — only when the work is
  large enough to need one. Front matter: `phase`, `cycle`, `lifecycle`.
- Research: `docs/superpowers/research/YYYY-MM-DD-<topic>.md` — opens with a
  **What is measured / What is conjecture** header, ends with **What would
  falsify this / Risks**.

**Evals: screens first, preregistered runs to decide.** While exploring, run
the fewest targeted runs that move the question and write a short research
note. Before a run that decides a default or a comparative claim, fix the
arms, n, scoring and rule in a preregistration. A screen is a **lead**, never
a rate. Do not re-open settled, measured decisions without a ladder run in
`ladder/`, recorded in `docs/ladder/`.

## 2. Test-first, both suites

- Every new test is **shown to fail first**, before the code that passes it.
- Node package suite (from the root): `npm test`.
- Python ladder suite (from `ladder/`): `uv run python -m pytest`
  (`-m "not slow"` for the fast subset). Never commit `trace.jsonl`,
  `stdout.txt` or `diff.patch`; raw ladder evidence goes in a
  `research-YYYY-MM-DD` release.
- CI (`.github/workflows/ci.yml`) runs the node suite and the ladder suite on
  every PR; it mirrors this local gate, it does not replace running it.

## 3. Measured settings are frozen without evidence

Do not change the prompt, templates, filter, tools, sampling or guards without
a ladder run in `ladder/` recorded in `docs/ladder/`. `prompts/mellum-worker.md`
is the **only** prompt source; run `node build.mjs` after editing it (a test
fails on template drift). A setting the shipped product does not use is a
harness finding, not a claim about the worker.

## 4. Document caps are not advisory

`ROADMAP.md` 400 lines; a Ships/Excludes cell 900 chars; a Status cell 1,000;
a backlog entry 1,200; a plan 400 lines and 25% fenced; a spec 400 lines.
`tests/docs-caps.test.mjs` enforces them. **Over cap means a research or verdict
doc is owed** — move the narrative to `docs/superpowers/research/` and link it —
**not that the wording gets trimmed.** `## Now` is a pointer, never a narrative.
Every backlog entry states a reopen condition; remove resolved/retired/superseded
entries. Preserve reversed decisions with dated corrections; never edit archived
plans.

## 5. Keep the changelog current

Update `CHANGELOG.md`'s `## [Unreleased]` in the **same commit** as any change to
what a user installs, runs, configures or reads (extensions, prompt, templates,
skill, README, recipe, the ladder's commands or records), under the existing
Added / Changed / Fixed / Removed headings. **Internal-only commits — SDD
records, backlog, roadmap, tests, CI, this skill — need no entry.** Entries say
what changed for the user and why, not the commit subject. Never add a `build`,
`prepare`, `prepack`, or `install` npm script (it breaks the pacote install).

## 6. Driving the worker (a lead under test)

Don't trust the worker's self-exit: a run can go green on an incomplete,
self-authored test. The direction being measured is an acceptance test that is
**external, complete and unweakenable**, with the exit verified by re-running
it and re-dispatching the failure. This is M.11 + the freeze-the-oracle guard,
**unmeasured until M.11's rung-9 screen** — a lead, not a rule. See the
[exit-gate note](../../../docs/superpowers/research/2026-10-18-harness-exit-gate.md).

## 7. Finishing a phase

Update the phase Status cell and `## Now` in `ROADMAP.md`; write the plan's
`## Result`, set `lifecycle: closed|superseded`, move it to
`plans/archive/`; remove any backlog entry it resolved. Confirm every claim
against its linked evidence, pass `node --test tests/docs-caps.test.mjs` and
`npm test`, and reconcile `[Unreleased]`. A phase may close before a release
tag. A release is a tag where `package.json`, the tag, both README install
lines and a `CHANGELOG.md` section agree.
