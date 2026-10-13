---
phase: M.7D
cycle: 1
lifecycle: superseded
---

# M.7D versioned deterministic assessments implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assess the fixed recorded failures in four independent dimensions,
without changing original ladder records or launching a model.

**Architecture:** One small `assessment.py` handles evidence and sidecars;
additional frozen artifact checks live beside the existing rung checks.
Explicit opt-in flags integrate the existing runner, rescore and summary.

**Tech Stack:** Python 3.14, uv/pytest, Node's existing test suite,
fixture-installed FastAPI/TestClient, Python standard library.

**Spec:** [M.7D design](../../specs/2026-10-11-m7d-versioned-assessment-design.md),
approved by Paul on 2026-10-11. Read `docs/sdd.md` before editing SDD records.

## Global Constraints

- Initial rule identifier `m7d-v1`; sidecar `assessment-m7d-v1.json`.
- Dimensions `behavior`, `verification`, `completion`, `report_support`;
  each status is `pass`, `fail` or `unknown`, with reason/evidence references.
- An observed violation wins over missing evidence; pass needs all required proof.
- Preserve original `run.json`, `check`, `score`, `check_rescored`, `table.md`
  when creating addenda. Legacy commands retain their default behavior.
- Same rule/evidence reuses identical bytes; changed existing sidecar conflicts.
- No model/provider calls, live model runs, new judge, general shell parser,
  case DSL, plugin registry, host adapter, new dependency or benchmark campaign.
- Prompt, guards, tools, sampling and shipped schema-2 recorders remain unchanged.
- Missing native settlement/abort data and ambiguous command/report evidence
  stay unknown. Discovery growth is descriptive, never a task-failure gate.
- Startup probes run in assessor-owned scratch, deadline **8 seconds**,
  stopping only their own process group. Model-run cleanup remains M.7E.
- Raw traces/stdout/diffs stay outside Git; preservation manifests unchanged.
- Exactly three implementation tasks. Every new regression is seen failing first.
- Preserve **Native** execution selected earlier: implement inline, one fresh
  whole-branch reviewer at the end. Ask for plan review, not method selection again.

## Review Focus

1. Same native tool ID in parent/child instances must not merge verification evidence.
2. A valid trace prefix followed by corruption cannot prove an absent command or completed attempt.
3. Manual review of another task/final reply must not support this report.
4. Startup occupied by an unrelated listener must be unknown, without killing that listener.
5. Missing workspaces and paths containing spaces must remain assessable/unknown without shell parsing.

The owning tests are pinned below. Three related tasks and unchanged defaults
favor Native execution; an error would mislabel research rather than change workers.

## File map and result shape

- Create `ladder/ladder/assessment.py`: pure evidence assessment, sidecar I/O,
  retained-run orchestration; no import of `run_ladder` (avoid a cycle).
- Modify `ladder/ladder/rungs.py`: additive `assessment_checks`; existing
  `Rung`, `CheckResult`, default checks and fixture task sentences stay intact.
- Modify `ladder/ladder/run_ladder.py`, `rescore.py`, `summarize.py`: opt-in wiring.
- Create `ladder/tests/test_assessment.py`, `test_assessment_artifacts.py`;
  extend existing runner/rescore/summary tests for integration only.
- Create `ladder/tests/fixtures_assessment/README.md`, `events.json`,
  `reports.json`, and small `parser-*` / `phase1-*` artifact directories.
  Fixture JSON is plain test input, not a production case format or raw dump.
- Update `docs/recipe.md` and Unreleased with changed commands/records.
- At close: short research finding, ROADMAP status/Now and archived plan Result.

Assessment fields: `rule`, `run` (directory name/rung/mode/repeat),
`task` (actual sentence, optional spec path/hash), `dimensions`, `sources`
(relative source path -> SHA-256), `assessor_checks`, `diagnostics`.
Each dimension is `{status, reason, evidence}`; evidence is a list of source
paths or observed instance/request/call references. No timestamp in the
sidecar: identical evidence must serialize identically.

## Task 1: Evidence contract and preserved sidecars

**Files:** `assessment.py`, `test_assessment.py`.

**Interfaces:**

- `RULE = "m7d-v1"`; `DIMENSIONS` is the four names above.
- `assess_evidence(record: dict, events: list[dict], stdout: str,
  checks: list[dict], *, review: dict | None = None,
  trace_issues: list[str] | None = None) -> dict`: returns
  `{dimensions, diagnostics}`; no file/process/provider operations.
- `write_assessment(run_dir: Path, assessment: dict) -> Path`: accepts only
  RULE, writes canonical sorted/indented JSON with trailing newline;
  exclusive creation, reuse byte-identical existing file, `RuntimeError`
  for different contents. Never edits legacy files.
- Check input: `{name, status, reason, evidence}`, optional `sources` hashes.
  Nonempty complete pass checks establish behavior; any fail wins;
  an unknown or no task checks prevents behavior pass.
- Review input: `{reviewer, task_sha256, final_sha256,
  material_claims_complete, claims}`. Each claim carries text/status/reason/
  evidence. Missing, stale or incomplete review is unknown; any reviewed
  contradiction fails. Pass requires complete coverage and all claims supported.
  Task hash covers canonical `{sentence, spec_path, spec_sha256}` (null for
  absent spec fields); final hash covers caller-visible final UTF-8 text.
  Stale review cannot supply a contradiction for a different task/final.
  No natural-language claim extraction.

- [ ] Write `test_dimensions_remain_independent`, `test_missing_evidence_is_unknown`,
  `test_observed_failure_wins`, and `test_sidecar_reuse_and_conflict_preserve_originals`.
  Arrange a literal correct-behavior/failed-verification/deadline case, unknown
  legacy lifecycle, and sentinel original run/table bytes. Key assertions:

  ```python
  assert result["dimensions"]["behavior"]["status"] == "pass"
  assert result["dimensions"]["verification"]["status"] == "fail"
  assert result["dimensions"]["completion"]["status"] == "fail"
  assert missing["dimensions"]["completion"]["status"] == "unknown"
  assert run_json.read_bytes() == original_run
  assert table.read_bytes() == original_table
  ```

- [ ] Add `test_verification_uses_final_state_and_requested_command`:
  exact requested command + structured exit 0 + positive tests passes;
  exit 5, zero tests, unrelated curl after failed pytest, and complete trace
  with no requested command fail. A later successful requested rerun passes;
  observed successful relevant edits after it fail pending re-verification; ambiguous compound
  shell commands or uncertain later mutations are unknown, not guessed.
- [ ] Add `test_tool_ids_are_instance_local` and
  `test_partial_trace_cannot_prove_command_absence`: reused ID in two instances
  retains distinct outcomes; corruption with no observed command -> unknown;
  an explicitly observed failed command still fails despite later corruption.
- [ ] Add `test_completion_uses_caller_boundary` and
  `test_chunked_attempt_needs_every_planned_step`: parent and child finals are
  separate, empty caller final/deadline/signal/abort fail, absent native fields
  unknown, and skipped/unfinished chunk prevents completion pass.
  Fully observed ordinary settled invocation with non-whitespace final text passes,
  including an honestly reported task failure; behavior remains independent.
- [ ] Add `test_report_review_is_bound_to_task_and_final`: no review, stale
  hashes, incomplete claim coverage or ambiguous claims -> unknown; pinned
  contradiction -> fail; complete supported manual claims -> pass.
- [ ] Run from `ladder/`: `uv run python -m pytest tests/test_assessment.py -q`.
  Expected: each new case fails for missing behavior before implementing it.
- [ ] Implement the interfaces in `assessment.py`. Recognize only existing
  requested argv forms, tokenized with `shlex` for single commands; compounds
  stay unknown. Reuse `bash_mutates` conservatively, not as proof of every
  possible shell side effect. Native structured `exit_code` and recognized
  pytest/Node positive test summaries support verification; `isError` alone
  does not. Legacy evidence requires explicit unambiguous command/results.
  `report_support` defaults unknown; derive task/final hashes consistently.
- [ ] Keep diagnostics observational: empty parsed final, blocked/unfinished
  calls, tool-output sizes and subsequent prompt sizes when available.
  Do not classify a lack of provider tool deltas as a model-versus-server cause.
- [ ] Run targeted tests, then `uv run python -m pytest` and root `npm test`.
  Expected: zero failures, no model requests. Commit
  `feat(ladder): add versioned evidence assessment contract`.
  Internal module/tests alone need no changelog entry until user commands land.

## Task 2: Frozen artifact checks and reviewed replay cases

**Files:** `rungs.py`, `test_assessment_artifacts.py`,
`fixtures_assessment/`, `test_assessment.py` as needed for replay assertions.

**Interfaces:**

- `assessment_checks(record: dict, workspace: Path | None) -> list[dict]`
  in `rungs.py`: returns Task 1 check shape, with candidate/spec source hashes;
  operates only on copied scratch artifacts. Unsupported task or missing
  source/environment returns unknown checks; observed defects still fail.
- Task selection: registered rung/spec contracts unchanged; additionally the
  exact retained parser task, “Make entries_from_lines ignore blank and
  whitespace-only lines, and add a regression test.” Select that task before
  ordinary rung-2 balance checks. No arbitrary task/rule registry.
- Candidate snapshot is complete (including deletions). Construct scratch
  baseline Git state from the matched fixture, overlay the complete candidate
  tree, retain only assessor-owned `.git`/environment, use offline sync and
  existing preflight. Do not fill absent candidate source/test files from baseline.

- [ ] Review/extract minimal cases from retained archives; do not modify originals.
  Sources: `pi102-transfer-1hfkued3/ledger_blank-mode_general-1` (unchanged),
  `ledger_blank-worker_tdd-1` (correct parser),
  `agentclinic_phase1-mode_general_facts-1` (Jinja leak),
  `agentclinic_phase1-mode_measured_facts-1` (valid render), and
  `pi110-guards-o9x_4230/agentclinic_phase1-timeout-1` (zero tests/false report).
  Record exact members, archive SHA from preservation manifest, omitted fields,
  neutral identifiers and normalization to ladder-shaped input in README.
  Keep only task-relevant sources/tests and short command/final/event excerpts.
  Label synthetic timeout/collision/control inputs; no raw trace files in Git.
- [ ] Write `test_phase1_semantics_reject_jinja_leak_with_valid_control` and
  `test_phase1_startup_requires_uvicorn_reload`: response 200, phase-spec
  layout/brand/navbar/favicon/title/viewport/Bootstrap/tagline and no literal
  Jinja directives; script starts a responding uvicorn server with reload
  lifecycle observed, while printing startup-looking text alone cannot pass.
  Validate behavior rather than mandating one source spelling. Preserve later-phase
  hidden checks. Existing `agentclinic-p2` is a valid phase-1 control.
- [ ] Write `test_required_tests_are_collected_and_meaningful`,
  `test_original_tests_preserved_with_additions_allowed`, and
  `test_empty_source_and_test_trees_fail`: expected smoke/regression exists
  and is collected; a targeted broken-behavior control fails for the named
  behavior, not import/collection errors;
  removed/weakened originals fail, permitted additions pass. Mutation sensitivity
  remains distinct from execution-time TDD; do not create a mutation framework.
- [ ] Write `test_blank_line_parser_rejects_unchanged_recovery`: independently
  exercise blank/whitespace inputs and preserve ordinary nonblank behavior;
  pinned unchanged source fails and the retained corrected parser passes.
- [ ] Write `test_required_path_collisions_fail_without_overwrite` and
  `test_assessor_hidden_files_are_not_candidate_collisions`: required file
  replaced by directory fails; candidate reserved `_hidden_p*.py` conflicts
  are diagnosed before hidden staging. Earlier assessor-injected hidden files
  may be excluded ONLY in scratch when recorded `hidden_collision == []`
  and their bytes match repository hidden checks; all other collisions fail.
  Original candidate and recorded files remain byte-identical throughout.
- [ ] Write `test_startup_port_conflict_is_unknown_and_listener_survives` and
  `test_startup_probe_stops_its_owned_processes`: fixed 8-second bound, explicit
  unrelated listener control, no external PID/listener termination. Missing
  offline fixture imports are unknown; candidate syntax/runtime defects fail.
- [ ] Add fixed event/report replay assertions for empty finals, aborted/blocked/
  unfinished calls, zero-test verification and discovery growth. Literal results:

  ```python
  assert unchanged["dimensions"]["behavior"]["status"] == "fail"
  assert zero_tests["dimensions"]["verification"]["status"] == "fail"
  assert false_report["dimensions"]["report_support"]["status"] == "fail"
  assert growth["dimensions"] == small_output["dimensions"]
  assert ambiguous_report["dimensions"]["report_support"]["status"] == "unknown"
  assert original_candidate_bytes == candidate_path.read_bytes()
  ```

- [ ] Run from `ladder/`: `uv run python -m pytest tests/test_assessment.py tests/test_assessment_artifacts.py -q`.
  Expected: new cases fail for their pinned defects before implementation.
- [ ] Implement `assessment_checks` with bounded existing fixture commands.
  Reuse existing checks only in scratch after collision inspection; never
  inject into the original workspace. Render via fixture TestClient; script
  startup uses `Popen(..., start_new_session=True)` in scratch and owned-group
  cleanup. Environment/port failures are unknown, not candidate failures.
  Keep probe results and source hashes compact; no candidate code in sidecar.
- [ ] Run targeted tests, all ladder pytest and root `npm test`.
  Expected: zero failures, valid controls accepted, no provider calls.
  Review fixture privacy/provenance; commit
  `test(ladder): freeze recorded artifact and lifecycle assessment cases`.
  Add Unreleased entry if this commit changes user-visible ladder checks/docs.

## Task 3: Opt-in CLI wiring, preservation proof and phase closure

**Files:** `assessment.py`, runner/rescore/summary and their tests,
`docs/recipe.md`, `CHANGELOG.md`, research finding, ROADMAP and this plan.

**Interfaces:**

- `assess_run(run_dir: Path, *, workspace: Path | None = None) -> dict`:
  read original `run.json`, tolerant `load_trace`, stdout/final, optional
  adjacent `report-review.json`; invoke Task 2 checks, assemble Task 1 result,
  run/task/source identities. `sources` includes run/trace/stdout/final/review
  hashes when present, plus Task 2 candidate/spec hashes. Do not write; missing
  workspace/evidence is unknown.
- `assess_directory(directory: Path) -> dict[str, str]` in `rescore.py`:
  sorted `*/run.json`; assess/write sidecars; report written/reused/conflict.
  Errors/conflicts produce nonzero CLI exit while retaining all original files.
- CLI option for all three commands: `--assessment m7d-v1`, default absent;
  only this rule accepted, parser destination `assessment_rule`. Missing/invalid
  value gives usage error before work; rescore assessment and
  `--existing-tests-kept` are mutually exclusive.
- `run_once(..., assessment_rule: str | None = None) -> dict`: keyword appended;
  when selected, assess/write after original artifacts exist. Returned legacy
  record and table unchanged. Tests use controlled launches, never a live CLI run.
- `summarize(directory: Path, *, assessment_rule: str | None = None) -> dict`:
  default current result unchanged; opt-in labels legacy plus separate rule/
  dimension pass/fail/unknown counts. Missing or corrupt/stale/wrong-rule sidecar
  counts unknown with diagnostic; no revised single pass or mixed comparison.

- [ ] Write `test_assessment_cli_preserves_run_and_table_bytes`,
  `test_assessment_cli_reuses_identical_sidecar_and_refuses_conflict`, and
  `test_assessment_cli_missing_workspace_and_space_paths` in rescore tests.
  Exercise the real offline CLI in a directory containing spaces, preserve
  literal sentinel old records/tables and hash evidence. Key assertions:

  ```python
  assert (run / "run.json").read_bytes() == original_run
  assert (phase / "table.md").read_bytes() == original_table
  assert sidecar["rule"] == "m7d-v1"
  assert sidecar["dimensions"]["behavior"]["status"] == "unknown"
  assert first_sidecar_bytes == sidecar_path.read_bytes()
  ```

- [ ] Add `test_runner_assessment_is_opt_in_and_preserves_record` and
  `test_assessment_option_validation_precedes_launch`: compare controlled
  runner outputs with flag absent/present, normalize only genuine run IDs/times;
  original record/table schemas identical, sidecar only when selected.
  Invalid rule never launches Pi. Chunked insufficient lifecycle remains unknown
  or fails on observed interruption; do not synthesize per-step settlement.
- [ ] Add `test_summary_separates_legacy_and_assessment_dimensions` and
  `test_summary_missing_corrupt_and_stale_sidecars_are_unknown`: one pass,
  one fail and one absent assessment -> literal counts 1/1/1 per dimension;
  preserve original comparison-table results under default invocation.
  Opt-in CLI labels `legacy` and `m7d-v1`; no pooled reliability rate.
- [ ] Run targeted assessment/runner/rescore/summary pytest tests.
  Expected: every new boundary assertion fails before implementing its behavior.
- [ ] Implement Task 3 interfaces; use one shared assessor for runner and
  retained cases. Validate review and sidecar source hashes before use.
  Malformed records/reviews are actionable diagnostics, never trusted passes.
  Avoid importing runner from assessment; reuse `pi_trace`, `rungs`, `score`.
- [ ] Run an end-to-end offline fixture assessment through real rescore and
  summary CLIs; hash original files/candidate snapshots before and after.
  Expected: dimensions match pinned cases, legacy files unchanged; new artifacts
  contain only reviewed assessment data. Make any Pi/provider/server launch
  fail in controlled integration tests to prove the assessment path is offline.
- [ ] Document flags and example dimension output in `docs/recipe.md`; add
  Unreleased entries for commands and records. Write short research finding
  with measured/conjecture headers, case/provenance links, falsifiers and risks;
  no new model rate, settings claim or historical table rewrite.
- [ ] Run root `npm test`, ladder `uv run python -m pytest`,
  `node --test tests/docs-caps.test.mjs`, and `git diff --check`.
  Expected: zero failures. Reconcile Unreleased with `git log v0.1.6..HEAD --oneline`.
  Review whole branch once via the Native workflow; fix Important/Critical
  findings RED→GREEN, ledger deferred minors/rulings. No live smoke or re-review.
- [ ] Commit implementation/evidence as `feat(ladder): expose opt-in m7d-v1 assessments`.
  After final review/verification, update M.7D Status/Now to M.7E, prune only
  resolved backlog items, add dated Result, close/archive plan with links fixed
  before archival. Run caps and npm after closure; commit `docs: close M.7D assessments`.
  Integration choice follows the finishing-branch workflow; no silent push/merge.

## Stop rule

Close with the finite matrix and preserved originals. Unknown retained evidence
is a legitimate outcome; no new trial, judge or infrastructure to fill gaps.
A startup/evidence limitation is recorded, not grounds to expand the phase.

## Result

Superseded 2026-10-13, unbuilt. The roadmap triage
([note](../../research/2026-10-13-roadmap-triage.md)) retired the phase: a
second consecutive instrument-only phase after M.7C, and the ladder's existing
checks had already found the Phase 4 id miss and the false-success claims the
four dimensions were to separate. Nothing was measured. The spec stays at its
path as evidence; the backlog entry "Versioned assessments" carries the reopen
condition.
