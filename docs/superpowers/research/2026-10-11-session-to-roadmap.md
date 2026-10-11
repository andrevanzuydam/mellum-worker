# Bare Pi research into the shipped workers

**Date:** 2026-10-11  
**Question:** What work should follow both agents' investigations?  
**Scope:** Preserve evidence and schedule harness, eval and host work.
Hello-world tuning is closed; no product implementation in this update.

**What is measured:** Linked exploratory runs, generated artifacts,
independent checks, provider events, guard prototypes and matching Pi source.  
**What is conjecture:** Comparative reliability, the model/server cause of
empty replies, general guard benefit and equivalent OpenCode behavior.

## Evidence inventory

Sources are local Pi/harness artifacts and these research records, inspected
2026-10-11. Counts belong to separate protocols; do not pool them into a
benchmark or infer a version improvement.

| Record | Direct evidence | Limits |
|---|---|---|
| [Other agent's analysis](2026-10-11-bare-pi-whack-a-mole.md) and [source/evidence audit](2026-10-11-bare-pi-deep-dive.md) | Four default tools; conditional bash-discovery instruction; large dependency results persist in later requests. | Contributing mechanisms, not a proven sole cause. Find/prefill percentages were not directly timed; lessons log retains corrections. |
| [Personal-context cleanup](2026-10-11-bare-pi-lessons.md) | Review procedure removed at user request; shorter global guidance and project command precedence. | Personal changes, not shipped worker changes or causal speed evidence. |
| [Natural-instruction round](2026-10-11-bare-pi-round-one-verdict.md) | 8/10 completed; seven tools and layout/search bullets did not consistently prevent scans. Correct artifacts have behavior-sensitive tests. | n=2 per condition, differing prompts/tools, sampled decoding. |
| [Pi 1.0.2 transfer/recovery/TDD](2026-10-11-pi102-mode-worker-experiments.md) | 11/16 complete/correct; upstream empty turns, unchanged-code recovery, template leakage and blocked server. Worker TDD achieved behavioral red twice. | Parent supervision is part of Worker results; rendering checks were post-hoc; corrected launch environment prevents causal version comparison. |
| [Pi 1.1.0 phase guards](2026-10-11-pi110-opt-in-guards.md) | 0/6 full passes; missing smoke tests. Two ~60 s timeouts, blocked scans, false test-pass report and two upstream empty finals. | Throwaway prototypes; mechanism worked, task benefit unestablished; compaction unexercised. |
| [Pi 1.1.0 hello guards](2026-10-11-pi110-hello-guards.md) | 3/6 correct, baseline 2/2 at ~17.8 s. Correct simple code/tests; three upstream empty finals; one scan blocked; no timeout fired. | Not evidence for installing guards or estimating comparative reliability. |

The [archive manifest](2026-10-11-session-evidence/manifest.json) records
private local preservation copies of all five experiment roots under
`~/.local/share/mellum-worker/research/2026-10-11/`, with SHA-256, file counts
and exclusions. Archives retain scripts, traces, events, code snapshots,
checks and judge evidence. Dependency trees, runtime symlinks and known
credential/config files are omitted. These are not publication-cleared assets;
review embedded personal/provider data before a research release. Raw files
remain outside Git.

## Findings and decisions

1. **Adopt Pi 1.1.0 as the next research baseline through a verified migration.**
   - Evidence: native tool durationMs and agent_settled.aborted appear in
     counted traces. Primary sources: [coding-agent changelog](https://github.com/earendil-works/pi/blob/v1.1.0/packages/coding-agent/CHANGELOG.md)
     and [AI changelog](https://github.com/earendil-works/pi/blob/v1.1.0/packages/ai/CHANGELOG.md),
     earendil-works, accessed 2026-10-11, 1.1.0 entries. Matching-tag source
     read from ~/PyCharmProjects/pi; checkout untouched.
   - Assessment: Recommendation for observation capability, not improved model
     reliability. Research used isolated 1.1.0; normal CLI remains 1.0.2.
     Decide the shipped minimum after compatibility checks; absent fields in
     older traces remain unknown, not zero.

2. **Promote observational telemetry before changing recovery policy.**
   - Evidence: current ladder/ladder/record-pi.js captures requests/calls/results,
     not correlated chunks, native durations or settlement. Temporary UUIDs
     distinguish parent/child instances even in a shared PID. SDK chunks lack
     tool calls in cited empty stops, before Pi normalization.
   - Assessment: Recommendation. Capture request/instance/call identities,
     timestamps and meaningful chunk timing; retain blocked and unfinished
     calls. SDK chunks do not distinguish model output from oMLX parsing.

3. **Score completion, behavior, verification and reporting separately.**
   - Evidence: existing checks missed Jinja leakage; recoveries passed unchanged
     tests; passing curl followed pytest exit 5. Process exit 0 and settled
     with aborted false also occurred without code.
   - Assessment: Recommendation. Freeze semantic rendering/startup checks,
     requested test-command evidence, generated-test requirements and judge
     inputs before trials. Add no-op recovery, empty source trees, glob/regex
     misuse, dependency output and file/directory collision regression cases.
     Mutation sensitivity measures tests; behavioral red measures TDD.
     Judges corroborate artifacts, rather than replace deterministic checks.

4. **Measure execution bounds with shipped guards and actual host runtimes.**
   - Evidence: timeout prototype bounded server calls without completing the
     task; discovery interception did not prevent server stalls. Mode/Worker
     already have recovery/loop guards; OpenCode does not inherit them.
   - Assessment: Recommendation. Measure opt-in timeout policy after scorer
     corrections, preserve explicit overrides and verify child-process cleanup.
     OpenCode needs its own lifecycle/tool-unit mapping and host checks.

## Roadmap disposition

Sequence before M.8, without marking implementation active:

- **M.7C — Pi 1.1 harness and correlated telemetry:** correct workspace launch,
  pin/record versions, promote observational contracts, replay old/new evidence,
  verify Mode/Worker compatibility and publish reviewed assets with provenance.
  A minimal ladder smoke checks instrumentation; no measured policy changes.
- **M.7D — completion and behavior evals:** freeze regressions and judge inputs;
  retain original scores alongside versioned revised dimensions. Cover missing
  tests, zero-test verification, unchanged-code recovery, empty finals, server
  deadlines, rendering/startup, discovery and file/directory collisions.
- **M.7E — measured execution bounds and host transfer:** compare opt-in timeout
  policy under shipped Pi guards, check cleanup/completion, and feed the evidence
  contract into M.3's OpenCode work. Narrow discovery policy only if retrieval
  remains material. Guard promotion requires applicable ladder measurements.

Deferred TDD/general-facts experiments remain in the backlog. There is no
universal TDD rule or automatic project .pi policy. Bare hello world stays
the neutral prompt, lean notes and seven tools; no further tuning for the video.

## What would falsify this

Tool-call deltas in cited empty stops would change failure attribution. Replay
mismatches or changed payloads invalidate recorder promotion. A revised scorer
rejecting valid implementations needs narrower checks. Controlled host trials
may establish guard benefit absent from these probes.

## Risks

Small samples and confounded historical environments limit comparisons. Local
archives are machine-specific until reviewed publication. Stricter scoring
changes historical rates, so retain original rubric/version labels. Optional
Pi 1.1 fields do not establish completion. Timeouts may interrupt legitimate
work or leave child processes; discovery heuristics may block valid recursion.
Preserve measured settings until the applicable ladder phase validates changes.
