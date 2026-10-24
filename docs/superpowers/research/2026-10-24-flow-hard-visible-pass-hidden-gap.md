# Flow hard: first end-to-end visible pass, and the oracle gap it exposed

Date: 2026-10-24. Status: single measured run, not a rate. The spec-driven
flow (`flow_run.py` + `extensions/mellum-flow.ts`) drove the **hard** suite
through all seven phases from scratch, on Mellum 2.1 (6-bit) via oMLX at
concurrency 1.

## What is measured

One full run of `flow_run.py --suite hard --concurrency 1 --attempts 4`:

- **All seven phases reached `tests PASS`** against their frozen per-phase
  gates — the first time the flow has carried hard end to end.
- Final grade: **`visible=PASS`, `hidden-grader=FAIL`**. Re-running the suite's
  own hidden grader against the finished workspace: **29 of 34 assertions
  pass, 5 fail**, all in the last two phases:
  - Phase 6 (`/tickets` report): the computed sums are wrong, and "archived"
    is derived from status rather than from `archived_at IS NOT NULL` as the
    spec states.
  - Phase 7 (`/visits` report): the endpoint returns an empty list — the
    grouped / sorted / filtered report produces no rows.
  - The four between-phase migrations are not all recorded.

Phases 1–5 pass the hidden grader. The coder's phase-1–5 code was spot-checked
by hand and is correct (e.g. archive returns 400 for an open complaint, 303 for
a resolved one, a monotonic audit `seq`, `/stats` open count).

## What is conjecture

The gap is the **complete-acceptance-test** problem, not a model limit. The
examiner's phase-6 and phase-7 gates are too weak — they accept an app that the
hidden oracle rejects — so the coder was never forced to produce the exact
sums, the `archived_at` definition, a non-empty `/visits`, or recorded
migrations. The conjecture is that a gate that is a true **superset of the
hidden oracle on these requirement types** would force a correct build. This is
unproven here: no run yet pairs a complete gate with a hidden pass.

## How we got here (all harness, never the model)

Every blocker on the road to `visible=PASS` was a harness defect; the model's
code was correct each time it was checked. In order, each fixed and pushed:

- oMLX's memory guard rejected every flow prompt (`prefill_memory_exceeded`);
  raised `--memory-guard-gb`.
- The examiner asserted a redirect on a client that follows redirects by
  default → now builds `TestClient(app, follow_redirects=False)` once.
- A dangling markdown fence broke the frozen gate's `compile()` → `asCode`
  strips lone fences.
- A phase was judged on the coder's own scratch tests → judged on the frozen
  gate only (`run_gate`).
- A self-contradictory absence check (`"X" not in html` where `"X"` is a prefix
  of a word the page shows) → target the specific control.
- The examiner (a thinking model whose reasoning cannot be capped) burned its
  whole token budget thinking and emitted nothing on complex phases → raised
  its `max_tokens`, then **compressed its prompt** (~4650→~2560 chars) so it
  reasons over less and converges.
- `bestPytest` salvages the test from any assistant block when the examiner
  ends on chatter.

## What would falsify / risks

- **Falsify the complete-oracle conjecture:** strengthen the examiner on
  general, spec-derived completeness (a report/query endpoint is tested by
  seeding representative rows and asserting the exact grouped/sorted/filtered
  result, not a bare 200; assert each definition and edge the spec explicitly
  states), re-run, and check whether a passing gate now coincides with a hidden
  pass. If hidden still fails with a demonstrably complete gate, the gap is
  elsewhere (coder, or the flow's per-phase isolation).
- **Risk — coding to the eval:** the examiner must derive completeness from the
  **spec**, never from the hidden grader's specific values or rows. The rules
  added stay general; the diagnosis above is for understanding, not for
  encoding the grader's answers into the examiner.
- **Risk — convergence vs completeness:** every rule added to make gates
  stronger lengthens the examiner prompt, which made this uncappable thinking
  model over-reason and stop emitting. More completeness must not reintroduce
  the empty-output stall; keep the prompt lean.
- n=1. A rate needs a preregistered multi-session run in `ladder/`.
