# Pi 1.1.0: opt-in timeout and discovery guards

**Date:** 2026-10-11  
**Question:** Do small, explicitly enabled guards improve bare Mellum on an ordinary phase task?  
**Scope:** Six counted runs, n=2 per arm, plus two excluded environment pilots. No shipped code, live ac-demo, global config or server changes.

**What is measured:** Six isolated executions, provider requests/chunks, native durations, tool outcomes, generated files, independent phase/render/startup checks and six final DeepSeek reviews.  
**What is conjecture:** Reliability beyond these attempts, benefit in Mode/Worker, and equivalent OpenCode behavior. This is not a controlled Pi-version comparison.

## Protocol and primary evidence

Local evidence: `/tmp/mellum-runs/pi110-guards-o9x_4230/`. `protocol.json`, `protocol-corrections.json` and `pilot-exclusion.json` record the method; `run.py` and `command.json` retain exact invocations; `summary.json` and `consistency-audit.json` retain measured results. Raw evidence is outside Git and not yet published.

The task was **Implement specs/phase-1-home.md**, using fresh copies of `ladder/fixtures/agentclinic-p1`. It is a FastAPI/Jinja phase, explicitly naming app.py and requiring a reload-enabled script entrypoint and a smoke test. Searching for/creating app.py here is grounded in the spec, unlike the earlier hello-world example-induced search.

The general AGENTS.md was identical in all arms: the actual uv pytest command, Python through uv, existing dependencies/configuration, scoped changes, preservation of tests, and verification before reporting. No red/green rule, measured write-list facts or task answers were added.

Pi 1.1.0 was installed under the temporary evidence directory; its Pi AI/agent packages are also 1.1.0 (`runtime-versions.json`). Every counted launch used `uv run --frozen <isolated-pi>` from its workspace, stdin /dev/null, print/JSON mode, seven explicit tools, no sessions, and discovery of extensions/skills/prompts/themes/MCP disabled. The recorder and candidate guard loaded through explicit -e arguments. No project .pi/settings.json was created. Profiles were mirrored to temporary directories; instruction, model/settings/global-note hashes and request parameters were identical across all six runs.

Requests retained max_tokens 16384, temperature 1, top_p .95, top_k 20 and the operator's thinking settings. The server check passed; no server setting changed. Runs were serial, with a 240-second deadline. Order: baseline/discovery/timeout, then timeout/discovery/baseline. No seed or cache reset.

Treatments, labeled throwaway research code:

- **Baseline:** bare Pi, seven tools, recorder only.
- **Timeout:** omitted bash timeouts become 60 seconds; explicit values are preserved. No prompt addition or task-specific command rule.
- **Discovery:** block root shell find, recursive ls/grep and ignore-bypassing rg heuristically, with a clear error directing the model to ignore-aware tools. Scoped shell find remains allowed. Discovery-tool results over 100 lines/12 KB retain a compact preview and a path to the original tool response. This is coarse policy, not a general shell parser: recursive grep/ls in a legitimate source directory can also be blocked.

Guard contract checks were observed failing for the omitted timeout and broad scan before implementation, then passing. An actual Pi BashTool environment check passed in every counted workspace. Explicit longer timeout preservation and compact-output preservation were contract-tested, but neither branch was exercised by these model trials.

Independent checks used the existing rung-6 scorer, an HTTP probe rejecting leaked Jinja syntax, and a bounded `python app.py` startup probe requiring uvicorn and reload logs. The probes were fixed before counted trials. Startup was added after an excluded pilot exposed a gap in the old smoke rubric. No checks or judge instructions were exposed to Mellum.

## Results

**0/6 fully completed the task.** Five artifacts render the home page without Jinja leakage; four launch uvicorn with reload via python app.py. None contains the required smoke test, and every canonical pytest check fails. Three runs reach the process deadline; two end with empty provider finals; one produces a visible but unsupported completion report.

| Arm | Repeat | Wall s | Requests | Peak tokens | Observed outcome |
|---|---:|---:|---:|---:|---|
| baseline | 1 | 240.0 | 16 | 6,145 | Deadline in python app.py; no smoke test |
| baseline | 2 | 240.0 | 11 | 26,840 | Dependency scan; deadline in uvicorn; missing script entrypoint/test |
| discovery | 1 | 240.0 | 15 | 7,293 | Two scans blocked; deadline in python app.py; no smoke test |
| discovery | 2 | 26.2 | 14 | 6,409 | Empty templates file; failed child writes; empty final |
| timeout | 1 | 184.2 | 26 | 12,979 | Two server timeouts; config edit; no tests; false pass claim |
| timeout | 2 | 29.7 | 13 | 6,944 | Working page; no tests; empty final |

Peak tokens use reported input + cacheRead + output; these are provider usage counters, not a separately measured context capacity. Total: 95 Mellum requests, 960.1 seconds invocation wall time. Native completed assistant response durations total 213.9 seconds. Response duration includes provider/server/network time and is not pure model inference.

## Findings

1. **Timeouts bounded commands, without establishing completion.**
   - Evidence: timeout-1's two server calls returned errors after 60010 and 60008 ms. The model then used curl and produced a report in 184.2 seconds, but pytest collected zero tests (exit 5), pyproject.toml was changed, and the reply claimed the smoke test passed. Timeout-2's only defaulted bash command was mkdir; its failure did not exercise the long-call bound.
   - Source: timeout attempts' trace.jsonl, events.jsonl, status.txt, oracle.json and judge-input.md; local harness, accessed 2026-10-11.
   - Assessment: Fact about the mechanism; no task-success benefit established by n=2.

2. **Discovery hygiene remains a real issue, with only partial guard evidence.**
   - Evidence: baseline-2's shell dependency scan produced a 52184-character serialized result and a 26840-token peak. Discovery-1 intercepted `find . -name "app.py"` and `grep -r "app.py" .`, and the model continued with the dedicated tools, but still hung in the server. Discovery-2 did not trigger the guard and stopped after failed file writes. Compact-output handling never activated in the counted matrix.
   - Source: calls/results in analysis.json and trace.jsonl; discovery-1/guard-events.jsonl; local recorder, accessed 2026-10-11.
   - Assessment: Fact about interception and reproduced scans. Lower candidate peaks do not establish a reliability/latency benefit; early incomplete runs and differing sampled trajectories confound comparison.

3. **Pi 1.1.0 did not eliminate the reproduced empty-final failure.**
   - Evidence: timeout-2 request 13 and discovery-2 request 14 contain reasoning (1442 and 70 characters), whitespace-only visible content, finish_reason stop and zero provider tool-call deltas. Pi likewise records empty normalized finals. Both emit agent_settled with aborted false, despite incomplete tasks. The three deadline kills emit no settlement event.
   - Source: SDK-parsed provider_stream_event records and normalized message_end events, per-attempt trace.jsonl; JSON events.
   - Assessment: Fact. The failure occurs upstream of Pi normalization; model versus oMLX parsing remains unresolved. Settlement identifies runtime state, not correctness.

4. **Behavior, tests, startup and reporting must be separate eval dimensions.**
   - Evidence: five home-page probes pass while all six task checks fail. Baseline-2 renders correctly but python app.py exits immediately. Timeout-1's curl succeeds while pytest finds zero tests; its final report nevertheless calls the smoke test passing. Discovery-2 writes an empty file named templates, then two child-path writes fail; it produces neither app.py nor tests.
   - Source: output snapshots, canonical oracle, semantic/startup audits, raw calls/results and final reply.
   - Assessment: Fact. A successful last command or passing external GET probe cannot substitute for requested deliverables and verification.

5. **Native timings improve observation, including explicit missing data.**
   - Evidence: completed assistant messages and executed tools have durationMs. The two blocked searches have no tool execution duration. Three killed foreground calls have no final duration; summing completed tools alone would hide their dominant wait. On timeout-1, native response time is 63.1 s and completed tools total 120.8 s.
   - Source: [Pi JSON events](https://github.com/earendil-works/pi/blob/v1.1.0/packages/coding-agent/docs/json.md), earendil-works, accessed 2026-10-11, tool_execution_end and agent_settled; native recorded events. [AI changelog](https://github.com/earendil-works/pi/blob/v1.1.0/packages/ai/CHANGELOG.md), 1.1.0 durationMs entry.
   - Assessment: Fact. Preserve native optional durations alongside runner deadlines and raw chunks; do not replace lifecycle accounting with sums of completed events.

## Corrections and limits

- The first two attempts inherited the ladder's Python PATH instead of the workspace environment. Bare python app.py failed to import uvicorn in that setup. They are retained under diagnostic-env-* and excluded. Launch was corrected before the six counted trials; the actual BashTool import/interpreter preflight proves the fix.
- The inherited Pi 1.0.2 harness also launched Pi directly from the ladder runner. Its uv-prefixed verification still used the fixture environment, but bare Python calls were not necessarily equivalent to starting Pi with uv from the project. Preserve those observed results; do not use them as a controlled version comparison.
- Initial judge drafts are retained. Final inputs use completed oracles, the full spec, configuration and newly created extensionless files, and visible final text separated from reasoning. An early draft had a missing oracle during an asynchronous audit. Some final judge prose still conflates external probes with generated test quality or overlooks the empty templates file; deterministic evidence takes precedence. All six final judges reject full task completion, but their wording is corroboration, not ground truth.
- n=2, one task/backend/machine, sampled decoding and warm/shared caches cannot establish comparative reliability. These bare-Pi results do not validate Mode/Worker or OpenCode guards.

## Recommendation

Stop this bare-Pi spike. Keep ordinary project instructions and explicit CLI tools; do not add universal project settings or a task-shaped app.py/hello-world recipe.

The measured timeout mechanism is a candidate for **opt-in Mellum execution bounds** shared by Pi Mode/Worker. Test it with their existing completion/recovery behavior before shipping. Discovery interception is a smaller candidate; narrow the coarse policy and measure it only if retrieval remains material. The output compaction branch still lacks model-run evidence.

Prioritize observational/scorer work: optional native durations, deadline versus settlement, exact verification command/exit and collected tests, full spec deliverables, file/directory collision cases, and provider-empty finals. A final curl pass must not erase a failed requested pytest command. OpenCode requires its own lifecycle/tool-unit mapping and host tests; shared policy does not establish equivalent protection.

Confidence is high in these reproduced mechanisms and failures, low in comparative rates. No product guard, prompt, settings or minimum Pi version changed. Temporary processes were cleaned; process-audit.json shows no experiment leftovers or port-8000 listener.

## What would falsify this

Counted evidence showing a generated passing smoke test, a provider tool-call delta in either alleged empty stop, or a command exceeding the omitted-timeout bound would overturn the corresponding finding. Broader randomized host trials could establish guard benefit absent from this sample.

## Risks

Raw /tmp evidence is ephemeral and unpublished. A durable ladder promotion needs separately preserved raw evidence. The coarse discovery heuristic can block legitimate scoped recursion, and 60 seconds may be too short for heavier work unless callers choose an explicit override. Neither guard verifies task completion.
