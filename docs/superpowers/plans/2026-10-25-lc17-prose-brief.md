---
phase: LC
feature_cycle: LC.17
cycle: 1
lifecycle: active
---

# LC.17: A prose brief stops at its first reply

## Goal

Write the eighth findings lesson, **A prose brief stops at its first reply**,
and the instrument its claim needs: a way to send a suite's phases as **one
brief** instead of steps, without copying the suite.

## Classification

Bounded, and the design was approved in conversation on 2026-10-25:

- **A flag, not a copied suite.** `--single-prompt` concatenates the suite's
  own prompts into one request. A `medium-oneprompt/` directory would duplicate
  the base and the grader, and two graders can disagree — then the comparison
  is not one change.
- **Medium only.** The easy suite has one prompt, so it cannot express
  "steps versus one brief"; medium's four phase briefs are the steps.
- **The arm is the prompt shape**, so it is a harness flag rather than an
  `arm_settings` entry: no environment variable changes the shape of a brief.

## Instrument

`learn/code/harness.py`:

- `run_suite(..., single_prompt=False)` sends `"\n\n".join(suite.prompts)` once
  instead of one request per prompt.
- `_run_sessions(..., single_prompt=False)` passes it through and records
  `single_prompt` in `run.json`, so a record can never be silent about which
  shape produced it.
- `harness.py run --single-prompt`.
- One test: with the flag, a two-prompt suite is invoked **once** and its log
  contains both briefs; without it, twice.
- `sweep_group`: after the last prompt, every process the run left in its
  group is ended and recorded as `leaked` in `run.json`. Two tests, and an
  end-to-end check that a backgrounded sleeper is found and killed.
- `machine` and `deadline` in `run.json`, because an M1 Pro wall and an M5 Max
  wall are not the same number even when they are the same session.

## Inputs

- [The arm inventory](../research/2026-10-24-lc13a-arm-inventory.md): lesson 8
  is "expressible" — a one-prompt variant of an existing suite.
- [The lessons 1–2 record](../research/2026-10-24-lessons-1-2-screen.md) and its
  **correction**: these runs are on an **M1 Pro, 8 cores, 32 GiB**, while the
  backend records were taken on an **M5 Max, 128 GB**. Peak tokens transfer
  between machines; walls do not.
- `learn/code/suites/medium`, [`learn/lesson-template.md`](../../../../learn/lesson-template.md).
- `main` at `7068c7d`; worktree `.worktrees/lc17-prose-brief`, branch
  `lc17-prose-brief`.

## Deliverables

- The flag and its test (done: 46 harness tests pass).
- [A preregistration](../research/2026-10-25-oneprompt-preregistration.md) that
  fixes arms, n, the medium deadline (measured by a timing probe, not guessed)
  and the reading **before** the arm runs.
- The run: `worker` on medium as steps and as one brief, n=3, same machine, same
  session length.
- `learn/lessons/prose-brief.md`, six steps, badges 1–5, no oMLX citation.
- `tests/lesson-prose-brief.test.mjs`, the index link, the nav entry, a
  changelog entry.
- At close: the LC.17 Status cell, `## Now`, `## Result`, plan archived.

## Constraints

- No worker, prompt, guard or suite-content change.
- Every wall reported is an M1 Pro wall and says so; no comparison with an
  M5 Max wall anywhere.
- A session that hits the deadline is reported as DEADLINE and never pooled as
  a pass or a failure.
- If the one-brief arm matches the steps arm, the page states a null and
  retires the "loses four passes" claim.

## Acceptance

`npm test`, `learn/code/tests` and `docs-caps` pass; the page's numbers are in
the run record; no `docs/ladder/` link on the page; `qualify --suite medium`
still passes.
