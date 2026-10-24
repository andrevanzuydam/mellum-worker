# Prompt v8–v11: triage

Date: 2026-10-24. Status: decision note, not a new measurement.

## What the four commits do

| Commit | Change | Evidence in PR #1 |
| --- | --- | --- |
| `10785ab` | v8: run the whole named test file; never a single `::test_function` | Fixes rungs 4/5 self-narrowing |
| `18f9425` | v9: the spec is the contract; implement every requirement, even without a visible test | Rung 9 phase-4 id miss flips green |
| `4666612` | v10: never start a foreground server; use `TestClient` | Removes deadline kills; adds a foreground-server guard |
| `da04888` | v11: re-read the spec clause by clause before finishing | Rung 9 reaches 3/3 with v10 |

The PR branch also regenerates OpenCode templates. Current `main` is Pi-only;
those templates are not applicable.

## Decision

**Do not replace the Baseline Worker prompt v5 with v11.**

v11 is a test-driven worker prompt. It begins “You make one failing test
pass,” expects a named test file/spec, and includes AgentClinic-specific
examples such as `Complaint`. The current suites send phase requests, not a
named failing test; the hidden grader is not visible. Applying v11 to the
suite harness would misframe the task. The hard spike also used a v9-like
prompt and was worse, not better.

Keep v5 as the suite/Baseline Worker prompt. Preserve v8/v9/v11 as a
**ladder prompt catalogue** for test-driven rungs, with their original
records. If we ever want a v11 suite arm, it needs a suite-shaped prompt and
its own screen; it is not a drop-in.

The v10 foreground-server **guard** is separable from the prompt. It blocks a
bash command that starts a server in the foreground and is a candidate for a
small guard PR, like workspace confinement. It is not accepted here; it would
change the Baseline Worker and needs its own screen and re-baseline decision.

## What follows

- Baseline Worker stays on v5.
- Flow/examine keeps its own orchestrator/examiner prompts; it does not inherit
  v11 by default.
- The PR #1 source map marks prompt v8–v11 **deferred**, and the foreground
  server guard **pending**.
