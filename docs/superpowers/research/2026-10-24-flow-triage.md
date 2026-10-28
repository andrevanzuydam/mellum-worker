# Flow/examine: triage

Date: 2026-10-24. Status: extraction boundary, not a design.

## What it is

Flow is a different agent architecture, not a change to `/mellum`:

- a top orchestrator calls phase tools: `plan`, `review_plan`, `examine`,
  `code`, `review_code`, `test`;
- `examine` is a sub-agent that reads only the spec and writes a frozen
  acceptance test;
- `code` is a sub-agent with write/execute tools;
- `test` runs the accumulated frozen gates;
- best-of-N and a phase tool-call cap are optional runners.

The hidden grader stays hidden and runs once at the end.

## Files in PR #1

Core:

- `extensions/mellum-flow.ts`
- `learn/code/flow_run.py`
- `tests/mellum-flow.test.mjs`
- `learn/code/tests/test_flow_run.py`
- flow research/record files

Dependencies currently named by `mellum-flow.ts`:

- `extensions/mellum-knowledge.ts` — `lookup` tool;
- `extensions/mellum-nonblock.ts`;
- `extensions/mellum-guards.ts` — already in `main`;
- `extensions/mellum-surgical.ts`.

`flow_run.py` imports `loop_run.py` only for helpers (`pin_profile`,
`stream_trace`, `emit`, `run_tests`). It does not need the whole loop workflow.
`docs_lookup.py` builds the knowledge index.

## Evidence

- `99ac5fd`: one hard flow run on oMLX 6-bit, concurrency 1, attempts 4.
  All seven phases reached `tests PASS` against frozen gates:
  **visible=PASS**, hidden **29/34**. Failures were phases 6–7: wrong
  `/tickets` sums, archived-by-status, empty `/visits`, unrecorded migrations.
- `5ad7c03`: adds a general completeness rule for reports and recorded
  migrations. Measured only that the phase-7 examiner still converges.
  **No full hard run after it, and no hidden pass yet.**
- The source is oMLX, not llama.cpp. Transfer is unmeasured.

## Decision

Do **not** extract or merge Flow as part of the PR #1 recovery branch.

Flow needs its own phase and design:

1. Define whether Flow is a replacement for `/mellum`, a separate mode, or an
   optional orchestrator.
2. Choose the minimal dependency set. `mellum-nonblock`, `mellum-surgical` and
   `mellum-knowledge` may be optional; do not carry them just because the
   branch imports them.
3. Keep the hidden grader out of the run; visible gates and hidden scoring stay
   separate.
4. Run one hard flow on llama.cpp after `5ad7c03`, with visible and hidden
   results; no claim before that.
5. Treat Flow as a new baseline, not the Baseline Worker.

## Ticket #5

Ticket #5 is the input to this phase, not a request for hand-authored phase-1
tests. Comment on it with the flow triage and the latest commit; close it only
when the Flow phase decides.

## Not in scope

Dashboard, feed/replay, plan/loop/surgical/quality/ncm/context/rethink/files/
vision extensions, and the PR’s Getting Started/install docs.
