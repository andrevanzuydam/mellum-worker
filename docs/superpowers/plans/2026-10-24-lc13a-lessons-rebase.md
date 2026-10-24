---
phase: LC.13A
cycle: 1
lifecycle: active
---

# LC.13A: the Lessons re-base on llama.cpp

## Goal

Make the Lessons track consistent with the settlement Getting Started now
teaches — llama.cpp, prompt v5, the easy/medium/hard suites — and with the
lesson template. Every page's evidence comes from the new instrument; the
oMLX citations leave the pages, and `docs/ladder/` keeps the oMLX records
exactly as they are.

## Inputs

- [The nudge preregistration](../../research/2026-10-24-nudge-llamacpp-preregistration.md)
  and [the arm's record](../../research/2026-10-24-nudge-llamacpp-screen.md).
- [`docs/sdd.md`](../../../sdd.md): screens first, preregistered runs to
  decide, caps applied at every update.
- [`learn/lesson-template.md`](../../../../learn/lesson-template.md) and
  [`learn/lessons/baseline.md`](../../../../learn/lessons/baseline.md), the
  only page already on the taught backend.
- `docs/ladder/reference-llamacpp-rungs1-5` and
  `docs/superpowers/research/2026-10-21-basic-remedies-runs.md`, the only
  llama.cpp evidence the track already has.
- `main` at `73fadc8`; branch `lessons-rebase` cut from `lc13-guards`, so the
  LC.13 page is present and can be rewritten in place.

## Deliverables

- An arm inventory: for each of Paul's ten lessons, the arm, whether the
  suites harness can express it today, and its cost.
- Preregistered arms in staircase order, recorded in
  `docs/superpowers/research/`, not in `docs/ladder/`.
- `learn/lessons/*.md` rewritten: no oMLX citation, `backends: [llamacpp]`,
  the template's subsections and columns, `screen` badges where the arm is a
  screen and `cited` only where a preregistered arm supports it.
- A `ROADMAP.md` row and `## Now` pointer, kept current as the work lands.

## Constraints

- Do not delete or edit `docs/ladder/`; the oMLX records are evidence for
  their own backend and keep their place.
- No comparative claim without a preregistration that fixed the arms, n,
  reading and rule first.
- One change between arms. The guard arm's void result is the cautionary
  case: two arms that never differ in behaviour cannot be compared.
- Keep the claim narrow in each page, and never quote a rate from n < 10.
- The worker, the guard, the prompt and the Baseline Worker change only in
  an arm that measures the change, with a re-baseline.

## Findings carried into this phase

- **n = 5 on easy is noise.** The same policy scored 2/5 and 3/5 in two
  samples of one task, with zero fires in both. Any rate a lesson states
  needs n = 10 or more.
- **The nudge's condition does not match this backend.** `isEmptyAssistantTurn`
  continues only `stop`; the empty finals recorded here were `error`
  (context overflow) and `length` (output cap). The guard is not wrong, it is
  shaped for a different ending.
- **The context window blocks the instrument.** The worker refuses Pi's
  auto-compaction while the mode is on, so an easy run reached 51,697 tokens
  against `n_ctx` 50,176 and died. This is the first thing to settle, because
  every later arm inherits it.

## Tasks

### Task 1: The guard arm (done, void)

**Record:** [the screen](../../research/2026-10-24-nudge-llamacpp-screen.md).

Preregistered, run, closed: worker 2/5, no-nudge 3/5, zero nudge fires in
ten sessions, medium not run by the staircase's rule. Nothing to re-run;
the context budget has to be settled first.

### Task 2: The arm inventory

**Output:** a research note beside this plan.

For each of Paul's ten lessons: the arm, the harness support, and a verdict —
re-citable from the 45-session llama.cpp record, expressible today, needs a
new `arm_settings` entry, or needs rungs 6–9 that have never run on
llama.cpp. Include the lesson that has no arm at all. This is reading, not
running.

### Task 3: Settle the context budget

**Output:** a preregistration, then a run.

Either a window the easy suite fits inside, or a compaction policy that does
not refuse while the worker is on. It changes a setting the baseline was
measured with, so it is followed by a re-baseline of the easy suite at the
staircase n.

### Task 4: Arms in staircase order

Easy first, n = 10; medium only on a majority; hard only on a majority of
medium, and skipped when medium shows no headroom. Each arm gets its own
preregistration and record, and its page is rewritten as it lands.

### Task 5: Close

**Output:** Status cell, `## Now`, this plan's `## Result`, archived.

Confirm every page's claim against its record, run
`node --test tests/docs-caps.test.mjs` and `npm test`, and reconcile
`[Unreleased]`.

## Acceptance

No page under `learn/lessons/` cites an oMLX record; every page states the
backend and settings its evidence came from and links its record; every
number on a page appears in that record; and the four checks pass.
