# M.7D: versioned deterministic ladder assessments

**Date:** 2026-10-11  
**Phase:** M.7D  
**Status:** Approved by Paul on 2026-10-11; implementation plan review owed. Superseded 2026-10-13, unbuilt ([triage](../research/2026-10-13-roadmap-triage.md)); kept as evidence.

## Intent and boundary

Paul selected an offline, versioned scoring addendum to the existing ladder.
The goal is to distinguish correct artifacts, requested verification, normal
completion and supported reports before measuring execution policies in M.7E.
Keep the effort small: fixed checks for observed failures, existing commands
and test suites, no eval product or general judging infrastructure.

Evidence: [October 11 synthesis](../research/2026-10-11-session-to-roadmap.md),
[transfer/recovery cases](../research/2026-10-11-pi102-mode-worker-experiments.md),
[phase guard cases](../research/2026-10-11-pi110-opt-in-guards.md), and
[M.7C telemetry](../research/2026-10-11-m7c-pi-harness-telemetry.md).
Passing old tests missed unchanged parser behavior and leaked Jinja markup;
correct artifacts also appeared in timed-out runs without a terminal report.
These exploratory findings justify regression checks, not comparative rates.

## 1. Four independent dimensions

Each dimension has `status` (`pass`, `fail`, `unknown`), a concise reason and
references to the evidence used. Missing or ambiguous evidence is `unknown`.
An observed violation is `fail`, even if other required evidence is missing;
`pass` requires all evidence the dimension's frozen rule requires.

| Dimension | Pass requires | Does not establish a pass |
| --- | --- | --- |
| `behavior` | Independent task-specific checks pass on retained/generated artifacts; required tests exist and original tests are preserved. | Agent claims, old tests alone, process exit, or changed-file counts. |
| `verification` | The agent executed the task's requested verification command against the final relevant artifact state; it completed successfully and collected positive test counts when it is a test command. | An assessor's later rerun, unrelated curl success, exit 0 with zero tests, or a command started without a result. |
| `completion` | The caller-visible invocation has a substantive terminal reply, normal exit, observed non-aborted settlement and no unresolved execution at its terminal boundary. | Correct code, `agent_end`, exit 0 or a recovery nudge in isolation. |
| `report_support` | Reviewed concrete claims in the terminal report agree with artifacts and observed execution evidence. | Nonempty prose, an unreviewed success claim or a model judge's opinion. |

The assessment must retain the actual task sentence and referenced phase spec,
including requirements to add tests or preserve existing behavior. Do not
invent requirements from a generic hello-world recipe. Existing write-list
constraints remain task-specific checks; punctuation and stylistic choices
are not correctness criteria.

`behavior` and `verification` are deliberately independent. A later independent
check can prove behavior while verification remains failed or unknown. Likewise,
normal completion can pass for an honestly reported unsuccessful attempt.
Do not collapse these dimensions into a new single success rate.

For Mode, the caller-visible final and lifecycle belong to its invocation.
For delegated Worker, they belong to the parent; child outcomes stay identified
as child evidence. A parent's visible reply is never substituted for the
child's normalized final. A child failure cannot be erased by a parent claim.
For chunked runs, evaluate the complete planned attempt: all planned steps must
have run and completed normally. Keep M.7C's singular process fields scoped to
the last launched process; an earlier settlement cannot prove a later step.
Absent native settlement/abort data in historical records remains unknown.

## 2. Small versioned addendum, preserved originals

The initial rule identifier is `m7d-v1`. Write one
`assessment-m7d-v1.json` beside a run's existing `run.json`, containing:

- Rule identifier, run identity and actual task/spec identity.
- Four dimension results and the evidence references behind their reasons.
- Artifact/source hashes sufficient to identify the assessed state.
- Descriptive diagnostics for empty finals, unfinished/blocked calls and
  discovery-output growth when those observations are available.

This sidecar is an assessment record, not another trace or execution log.
Reference existing trace instance/request/call IDs and artifact paths; do not
copy conversations, auth/config data or raw dumps into it. Record assessor-run
checks separately from agent-run verification.

Original `run.json` fields (`check`, `score`, earlier `check_rescored`) and
historical `table.md` remain byte-unchanged when generating an addendum.
The existing legacy rescore behavior remains available; M.7D's new assessment
path must not call it to replace original results. Select the new rule explicitly
through the existing runner/rescore commands; ordinary invocations retain their
current output contract. The implementation plan will pin the exact flags.

Use the same evaluator for fresh selected runs and retained evidence.
Reassessment under a changed rule uses a new rule identifier and sidecar;
it never silently rewrites an existing assessment. Repeating the same rule
and evidence may reuse an identical sidecar; different contents at an existing
path produce an actionable conflict rather than overwrite. No overwrite flag
or assessment migration framework is required.

The existing summary command may select `m7d-v1` explicitly and report each
dimension's pass/fail/unknown counts. Missing sidecars count as unknown.
Label legacy and revised results separately; do not mix them or silently
change the meaning of existing pass tables. Creating an assessment does not
recompute published historical rates.

## 3. Frozen checks for the recorded failures

Use a finite regression matrix, with valid controls as well as failing cases.
Keep checks in the existing ladder/test structure. Add at most one small
assessment module and focused fixtures; no plugin registry, case DSL, generic
shell parser, host adapter or new dependency.

| Case family | Frozen requirement |
| --- | --- |
| AgentClinic rendering/startup | For phase 1, preserve the task's required layout/tagline and reject literal Jinja directives in the rendered response. Exercise the script entrypoint and require the specified uvicorn/reload startup behavior. Preserve checks for later phases. |
| Required generated and original tests | Required smoke/regression tests must be present, collected and exercise the named behavior. Removing or weakening original tests fails preservation; permitted additions remain allowed. Empty source/test trees do not pass vacuously. |
| Zero-test or wrong-command verification | A pytest exit 5, zero collected tests, unrelated successful command, or tests followed by unverified relevant edits cannot prove requested verification. Missing structured evidence stays unknown. |
| Unchanged-code recovery | The blank-line parser case must independently exercise blank and whitespace-only input. Passing the unchanged nonblank test after a nudge does not prove the new behavior. |
| Empty final and blocked/unfinished execution | Retain upstream-empty evidence without claiming model/server attribution. Distinguish attempted, blocked, started and ended calls; a deadline or abort fails completion without deciding artifact correctness. |
| Discovery growth | Preserve observed dependency-scan output and subsequent prompt growth as diagnostics. Large output alone is not a task failure or permission to alter discovery policy. |
| File/directory and assessor-file collisions | A directory where a required source/template/test file belongs is an explicit behavior failure. Existing assessor-reserved paths are diagnosed before staging hidden checks; assessment does not overwrite candidate artifacts. |

The matrix covers these observed mechanisms, not every possible implementation.
Promote short reviewed evidence excerpts or minimal artifact snapshots with
source archive hashes and exact transformations. Synthetic cases are labeled
as synthetic; they cannot become historical measurements. Raw archives and
the October 11 preservation manifest remain unchanged and outside Git.

Command verification recognizes only the existing task commands and observed
structured execution outcomes. Correlate by native instance/call identities.
For legacy cases, use only explicit retained command/result evidence; ambiguous
pairings stay unknown. Do not infer successful test execution from `isError`
alone or a terminal report. A positively identified failed requested command
may be superseded by a later successful execution against the final state;
an unrelated success cannot supersede it. When complete traces show that the
requested command was never executed, verification fails; incomplete traces
cannot prove absence.

Frozen artifact probes run locally in copied scratch workspaces with the
existing offline fixture environment. Render checks use the application test
client. Startup probes have a short fixed deadline and stop only processes
they own. Missing fixture dependencies, unavailable evidence or environmental
port conflicts are assessor limitations, reported as unknown with diagnostics;
candidate syntax/render/startup defects are failures. General cleanup of
model-run process trees remains M.7E.

Mutation sensitivity and behavioral TDD remain separate observations. Restoring
the original parser can establish that a generated test detects the bug; it
does not prove the agent ran that test red before implementing. No universal
TDD scoring requirement or model-facing instruction is added.

## 4. Report support without a judge

No model calls or general natural-language claim parser. Deterministic checks
prevail. Normal automatic assessments leave `report_support` unknown unless
concrete claims have been explicitly reviewed.

For the fixed replay cases, retain a small manual review record identifying
the actual task, terminal report, concrete claims, artifact checks and relevant
command/lifecycle evidence. A claim such as "the smoke test passed" fails when
the requested test command collected zero tests or failed. Changed-file counts
alone do not prove a claim to have implemented new behavior. Ambiguous prose
stays unknown. Manual pass requires that all task-material concrete claims
have been identified and supported; unrelated prose is not graded.

This record may supply the dimension's pass/fail result with provenance.
It is a review input/output convention for these cases, not a new reviewer
service, tool workflow or automated judge. Initial and corrected historical
judge verdicts remain evidence; they are neither rerun nor promoted into truth.

## 5. Acceptance and stop rule

Exactly three implementation tasks:

1. Pin the dimension/sidecar contract and evidence sufficiency rules with
   deterministic tests; preserve original records and unknown states.
2. Freeze the finite artifact/event regression matrix above with valid controls
   and reviewed fixture provenance, including manual report-support examples.
3. Wire explicit selection into existing runner/rescore/summary commands;
   verify compatibility, record findings and close/archive the phase.

Every new test is shown failing for its pinned defect before implementation.
Run `npm test`, ladder pytest, document-cap tests and diff checks. Include
end-to-end offline assessments that prove old records/tables are byte-identical,
missing evidence stays unknown, and rejected artifacts have accepted controls.
Verify no provider call occurs; do not run live model smokes or a benchmark.

Stop when the finite cases can be assessed with labeled provenance, independent
dimensions and preserved originals. Document an evidence gap as unknown;
do not recover historical evidence by launching another model attempt.
No new judge, dashboard, scheduler, generalized evaluator, recovery policy,
prompt/guard/tool/sampling change, OpenCode port or historical rate campaign.
User-facing ladder changes receive Unreleased entries as they land. Closure
updates M.7D's Status/Now, writes and archives the plan's Result, reconciles
the changelog and leaves M.7E as the next phase.

## Risks

- Finite artifact checks can reject valid implementations: freeze positive
  controls and test behavior rather than source spellings where possible.
- Historical evidence is incomplete: unknown is a useful result, not a reason
  to invent command success, native settlement or test execution order.
- Startup probing has side effects: isolate and bound assessor processes;
  never kill unrelated listeners or turn this into a runtime cleanup subsystem.
- Manual report-support review can be inconsistent: retain concrete claims
  and evidence, and leave ambiguity unknown rather than add an LLM judge.
- Four dimensions are more honest but less convenient than one pass number;
  summaries must preserve that distinction and label the selected rubric.
