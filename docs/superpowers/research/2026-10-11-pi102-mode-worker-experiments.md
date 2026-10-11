# Pi 1.0.2: completion, transfer and test-first experiments

**Date:** 2026-10-11  
**Question:** What do richer provider traces and small transfer experiments tell
us about ordinary project instructions, TDD, Mode and Worker?  
**Scope:** Sixteen isolated attempts, n=2 per arm; two excluded instrumentation
pilots. No shipped prompt, guard, server setting, live ac-demo or global config
changes. Video continuity is no longer a constraint. Temporary code is a
research spike, not a product implementation.

## Method and sources

Primary evidence, inspected 2026-10-11:
`/tmp/mellum-runs/pi102-transfer-1hfkued3/`. `protocol.json` records tasks,
order, corrections and provenance; `run.py` invokes Pi; `record-rich.mjs`
captures requests, SDK-parsed provider chunks, normalized messages and tool
events; `analyze.py`, `summary.py`, `phase-audit.py`, `process-audit.py` and
`judge.py` retain their inputs and results. `summary.json` is the compact
per-attempt record. Raw traces remain outside Git and are not yet published.
The original trace files were preserved, including excluded pilots and
initial judge verdicts.

Pi binary: 1.0.2. Worker: v0.1.6, source HEAD 6e7e0a7, prompt v5. Requests to
Mellum retain the operator's sampling: temperature 1, top_p .95, top_k 20,
max_tokens 16384, thinking and preserve_thinking enabled. No seed or cold-cache
reset. A read-only admin observation found server max_context_window 56000,
max_tokens 4096 and thinking_budget_enabled false; request caps take precedence.
Mode's own records report matching server settings. No server settings changed.

Supporting primary sources, accessed 2026-10-11:

- [Pi v1.0.2 provider adapter](https://github.com/earendil-works/pi/blob/v1.0.2/packages/ai/src/api/openai-completions.ts),
  earendil-works, lines 558–675: calls onProviderStreamEvent before accumulating
  content, reasoning and tool_calls; maps finish_reason into rawStopReason.
- [Pi extension event types](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/src/core/extensions/types.ts),
  earendil-works, ProviderStreamEvent. Matching-tag source read from Paul's
  `/Users/pauleveritt/PyCharmProjects/pi`; its checkout was not changed.
- [Mode source](../../../extensions/mellum-mode.ts): one-shot headless command,
  facts forwarding, request filtering and completion record.
- [Worker definition](../../../templates/pi/mellum-worker.agent.md): bounded
  prompt, seven tools, context inheritance off, parent verifies child.
- [Existing phase scorer](../../../ladder/ladder/rungs.py): check_agentclinic,
  fixed hidden checks, original-test preservation and write-list scoring.
- Each run's `output/specs/phase-1-home.md`, generated sources, provider trace,
  oracle, process audit and judge evidence: exact task requirements and outcomes.

All Mellum trials ran serially. Repeat 1 was baseline then candidate; repeat 2
was candidate then baseline. Every workspace was a fresh fixture/project copy,
Git-initialized and synced offline. Runs used stdin /dev/null, `-p --mode json`,
a fresh mirrored Pi profile and a 240-second deadline. Mode used the actual
`/mellum <task>` command with its shipped guards/facts. Bare used seven tools and
context files, with extensions/skills/templates/themes disabled. Worker used
`Use mellum-worker to do this: <task>`, the normal hosted DeepSeek parent and
pi-subagents, with a locally rendered worker definition and trace extension.

The four questions were completion diagnosis, repository discovery on transfer,
general project facts on an actual phase, and a separate short TDD convention.
Discovery was observed across tasks; this matrix did not add a new search guard.

Tasks:

- Hello control: “Add a hello world module with a Python test.”
- Phase transfer: “Implement specs/phase-1-home.md”.
- Existing behavior: “Make entries_from_lines ignore blank and whitespace-only
  lines, and add a regression test.” This replaced a proposed new balance()
  feature before trials, giving a behavioral red rather than a missing import.

The phase baseline used its measured test command, write list and prohibitions.
The general replacement retained the command/environment, existing dependencies
and configuration, task scope, original tests and a final test report. It also
added --frozen. These are a section-level comparison, not a single-bullet test.
The TDD arm added only: “For new behavior and bug fixes, write a test first,
confirm the expected failure, then implement and rerun the tests.”

## Results

“Successful” means independent behavior/spec checks, a terminal report and no
timeout. The phase semantic check below supplements the fixed hidden rubric.
Elapsed includes Pi startup, guards and, for Worker, hosted parent work.

| Task | Arm | Successful | Elapsed seconds, repeats 1 / 2 | Behavioral red before implementation |
|---|---|---:|---|---:|
| Hello | Bare, seven tools | 2/2 | 16.7 / 46.3 | Not requested |
| Hello | Mode | 2/2 | 13.6 / 17.3 | Not requested |
| Phase 1 | Mode, measured facts | 2/2 | 52.2 / 40.6 | Not requested |
| Phase 1 | Mode, general facts | 0/2 | 150.2 / 240.0 (timeout) | Not requested |
| Parser | Mode, general facts | 1/2 | 30.2 / 47.2 | 0/2 |
| Parser | Mode, TDD facts | 0/2 | 36.1 / 26.9 | 0/2 |
| Parser | Worker, general facts | 2/2 | 65.1 / 49.2 | 0/2 |
| Parser | Worker, TDD facts | 2/2 | 82.0 / 64.1 | 2/2 |

Totals: 11/16 successful agent executions. Thirteen artifacts pass the initial
behavior/hidden oracles, but one of those fails semantic rendering, leaving
12/16 correct artifacts. The remaining correct artifact timed out without a
terminal report. All sixteen received a separate DeepSeek code review.

## Findings

1. **Claim: These empty finals originated before Pi's normalization.**
   - **Evidence:** Eight Mellum turns across four attempts contain reasoning,
     whitespace content, finish_reason stop and zero provider tool-call deltas.
     Normalized turns likewise contain no call. Three Mode parser attempts then
     ran only the existing test and reported completion without any edits.
     Example: mode_general-1 request 4 has 6,801 reasoning characters, 2,041
     output tokens, no non-whitespace content and no tool delta; request 5 is
     the empty-final recovery nudge. The original task remains in context.
     Worker TDD repeat 1 contains five such turns across initial/resumed children.
   - **Source:** Per-run trace.jsonl and analysis.json, request-correlated chunks
     and assistant message_end records; matching provider adapter cited above.
   - **Assessment:** Fact for this reproduction. This rules out loss of a
     present provider tool-call delta in Pi's normalization. It does not separate
     model generation from oMLX's upstream reasoning/tool parser, and does not
     retrospectively prove the cause of the earlier bare-Pi failures. Stop was
     not length; server budget was disabled and requests named 16,384 tokens.

2. **Claim: Passing the existing test command is insufficient for completion.**
   - **Evidence:** Three unchanged parser artifacts pass the old nonblank test,
     yet the independent blank-line probe raises ValueError. Mode's records
     show lastCommand ok, zero files/edits, one recovery nudge and a visible
     final report. The general phase's second trial has correct generated code
     and passing tests but stalls in `uv run python app.py` until the deadline.
     Its final provider response contains a real tool call, not an empty final.
     Pi's shutdown removed the detached reload server; no leftover was found.
   - **Source:** mode-runs.jsonl, metadata.json, oracle.json, provider chunks,
     test results and process inventory after timeout.
   - **Assessment:** Fact. Recovery improved answer visibility without satisfying
     the requested behavior in the three parser failures. Completion, behavior,
     executed tests and report support must remain separate eval dimensions.

3. **Claim: A broader eval finds a defect the phase smoke/hidden tests missed.**
   - **Evidence:** General-facts repeat 1 substitutes strings from home.html into
     base.html instead of rendering Jinja. GET / returns literal `{% extends %}`
     and `{% block %}` directives. Its smoke and existing hidden checks pass.
     A post-hoc HTTP response probe rejects that leak; the other three phase
     artifacts pass the same probe. With the actual spec and response evidence,
     the independent judge rejects the first general artifact and accepts the
     other three as correct code; it marks the timeout's report unsupported.
   - **Source:** Phase output/app.py, templates, semantic-audit.json and revised
     judge-input/verdict files.
   - **Assessment:** Fact, with a post-hoc rubric addition. Initial judge inputs
     omitted the actual spec and lifecycle outcome; initial verdicts leaned too
     heavily on passing tests. Those verdicts were retained and the phase judge
     was rerun with the missing evidence. Judge agreement is corroboration,
     not a substitute for the independently observed response defect.

4. **Claim: Short TDD wording did not make Mode execute TDD on this task.**
   - **Evidence:** Both Mode TDD trials received the bullet in the actual user
     payload, but neither edited code or added/executed a new test. The general
     Mode arm succeeded once, writing implementation before its regression test.
   - **Source:** Provider request facts, tool timeline and process-audit.json.
   - **Assessment:** Fact for these attempts; no evidence of a useful Mode
     policy effect. n=2 does not establish that TDD wording causes failures.
     The execution/emission failure prevented the intended process comparison.

5. **Claim: Worker forwarded TDD and achieved it, with parent supervision.**
   - **Evidence:** Both TDD parents explicitly supplied test → expected failure
     → implementation → green in the child brief. Both children produced a
     genuine execution-time ValueError on the new blank-line test before the
     implementation changed. Both final artifacts pass the independent oracle;
     restoring the original parser makes each generated regression fail.
     General Worker artifacts also pass this mutation check but implement first.
     TDD repeat 1's initial child stalls; the parent inspects the transcript,
     resumes the child, corrects an escaped-tab fixture issue and reruns tests.
     Repeat 2 finishes without that resume. Parents verify final results.
   - **Source:** subagent task/resume inputs, child requests, process-audit.json,
     regression mutation outputs, final parent tests and judge verdicts.
   - **Assessment:** Fact about propagation/order/outcomes. The parent also adds
     implementation details, scope and example assertions. This is the shipped
     delegation architecture doing useful work, not evidence that the same raw
     task or one isolated TDD sentence made Mellum intrinsically more reliable.

6. **Claim: More tools and a smaller prompt do not guarantee bounded discovery.**
   - **Evidence:** Bare hello repeat 2 still shell-scans .venv; its peak reaches
     27,888 tokens versus 5,073 in repeat 1. Mode hello stays at 3,543–3,936
     tokens but still performs multiple exploratory reads/listings/searches.
     General-facts phase repeat 2 shell-scans dependencies and reaches 34,277
     Mellum tokens. Both measured-facts phase runs avoid that broad shell scan.
   - **Source:** Calls, provider payloads and model-specific usage in analysis.json.
   - **Assessment:** Fact, not proof of a universally better facts section.
     Both general phase runs pass fixed hidden checks; one has the semantic
     failure and the other never finishes. Do not replace the measured fixture
     or add increasingly specific hello-world instructions based on this sample.

7. **Claim: Recorder identity must include the runtime, not only the process.**
   - **Evidence:** Installed pi-subagents executes initial parent/child runtimes
     in one PID; both recorder instances restart request numbering. A resumed
     child can instead get a new PID. The temporary recorder now uses a UUID
     per instance with per-instance counters. The first Worker trace is
     reconstructed from serial parent/child model transitions; raw data remains
     intact. Recorder contract tests failed before each missing capability was
     added, then passed without mutating payloads. Recorded serialization/append
     time totals at most 1.19% of invocation wall time in this matrix.
   - **Source:** record-test.mjs, record-rich.mjs, provider runtime/PID transitions,
     recorder_stats and summary.json.
   - **Assessment:** Fact. This is SDK-parsed provider data, not raw HTTP bytes
     or model tokens. The measured append fraction is not a controlled benchmark
     of observer overhead. Keepalive chunks are not meaningful first-token data;
     Pi's responseModel can say keepalive because it retains the first differing
     model field, while later chunks name the actual Mellum model.

## Open questions and limits

- n=2, sampled decoding, no seed/cold-cache isolation and a shared server:
  failure examples are useful; comparative rates/latencies are not established.
- General phase facts jointly change restrictions, wording and --frozen. No
  individual bullet has a causal effect established here.
- The rendering probe and corrected judge rubric are post-hoc and labeled as
  such. Future evals should freeze those checks before trials.
- Two pilots were excluded before the matrix: an evidence AGENTS.md above the
  workspace duplicated inherited context; a punctuation-specific hello oracle
  rejected an allowed lowercase greeting. Both were corrected and retained.
- First Worker correlation was reconstructed; later runtime IDs are explicit.
- Worker uses the operator's actual parent/packages; parent brief enrichment,
  retries and verification are part of the treatment. Four Worker passes are
  four end-to-end executions, not four uninterrupted child successes.
- No OpenCode experiment ran. Its streaming and recovery paths require their
  own checks; shared prompt text does not imply shared runtime protection.
- Local /tmp evidence can disappear. Publish raw evidence separately if this
  becomes a durable/public ladder result; never commit trace.jsonl/diff.patch.

## Recommendation

Keep this investigation proportional: no further hello-world tuning, no new
AGENTS.md ban on rereading context, and no universal TDD rule from these data.
Confidence is high in the reproduced failures, low in comparative reliability.

The next useful product work is observational recorder/scorer improvement:
instance-correlated provider events, task behavior versus command exit, correct
terminal/timeout classification and a frozen template-rendering eval. Preserve
blocking-server and empty-final-with-unchanged-code cases as regression evidence.

For ordinary developer facts, retain the real command/environment and explicit
bounded constraints such as no new dependencies. General prose is reasonable,
but this experiment does not justify replacing measured phase facts wholesale.
When TDD is desired for Worker, make it a requirement in the parent brief and
verify the observed red/green order; the short project bullet alone is not an
execution guarantee. Promotion into shared prompts/guards or OpenCode needs
applicable ladder and host checks. Temporary harness code remains throwaway.

## Environment correction — 2026-10-11

The subsequent [Pi 1.1.0 guard spike](2026-10-11-pi110-opt-in-guards.md)
found that the reused runner launched Pi directly while inheriting the ladder's
Python PATH, rather than starting it through uv from each fixture workspace.
Uv-prefixed commands still resolved fixture dependencies; bare Python commands
could use the ladder interpreter and fail to import project dependencies. The
observed traces/oracles above remain evidence of those executions, but this
setup is not equivalent to a developer's `uv run --frozen pi` environment and
must not serve as a controlled version comparison. The 1.1.0 counted matrix
corrected launch and passed an actual Pi BashTool environment check per trial.
