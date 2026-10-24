# Prompt v6–v11: triage

Date: 2026-10-24. Status: decision note, not a new measurement.

## Versions before v8

| Version | Commit | Change | Disposition |
| --- | --- | --- | --- |
| v5 | current `main` | The 643-character task prompt; no guardrails | shipped Baseline Worker |
| v6 | `be91ff6` | Keep every existing test; change only what the task requires | defer as a prompt arm; fold the pathology into test preservation |
| v7 | `53728d4` | Test-driven: make one named failing test pass, read its spec, run only that test | keep as a ladder prompt; mediated-test lesson; not a suite prompt |

v7 begins the test-driven line. It says “Run ONLY the test named in the task”
and forbids editing it; v8 changes that to the whole test file. v7 is evidence
for the mediated-test lesson, not a replacement for v5.

## v8–v11

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

Keep v5 as the suite/Baseline Worker prompt. Preserve v7–v9 and v11 as a
**ladder prompt catalogue** for test-driven rungs, with their original
records. v6 is a separate completeness arm, not part of that catalogue. If we ever want a v11 suite arm, it needs a suite-shaped prompt and
its own screen; it is not a drop-in.

The v10 foreground-server **guard** is separable from the prompt. It blocks a
bash command that starts a server in the foreground. Extract it as a dormant
guard with its tests, like workspace confinement; do **not** enable it or
change the Baseline Worker until a screen and re-baseline decision. The v10
prompt line itself stays in the ladder catalogue.

## What follows

- Baseline Worker stays on v5.
- Flow/examine keeps its own orchestrator/examiner prompts; it does not inherit
  v11 by default.
- The PR #1 source map marks prompt v7–v9/v11 **kept as ladder evidence**, v6
  **deferred**, and the foreground-server guard **keeping dormant** pending a
  screen.
