# Pi 1.1.0: bare hello world and opt-in guards

**Date:** 2026-10-11  
**Question:** Do generic discovery or timeout guards help bare Pi with hello world?  
**Scope:** Six isolated ac-demo copies, n=2 per arm; no Mode, Worker, TDD guidance or shipped changes.

**What is measured:** Requests, provider chunks, native durations, tool results,
generated artifacts, independent behavior/test/mutation checks and six DeepSeek
judge reviews.  
**What is conjecture:** Comparative reliability, guard causality, model versus
oMLX responsibility for empty responses, and transfer to other hosts/tasks.

## Protocol and primary evidence

Prompt: **Add a hello world module with a Python test.**

Local primary evidence, produced by Pi and the research harness, accessed
2026-10-11: `/tmp/mellum-runs/pi110-hello-ny6sfma5/`. `protocol.json` freezes
the task and checks; per-run `command.json` records invocation;
`trace.jsonl` and `events.jsonl` retain provider/native events;
`summary.json` and `consistency-audit.json` retain final measurements.
`oracle.json`, `semantic-audit.json`, `independent-test.json` and
`judge-verdict.json` retain checks. Raw evidence is unpublished and outside Git.

Each fresh workspace copied current Git-tracked ac-demo files, including its
working AGENTS.md. The notes give the uv pytest command, uv Python execution,
existing dependencies/configuration, scoped changes, preservation of tests,
and verification before reporting. They contain no app.py example, solution
layout, search recipe or red/green requirement. The project overview still
describes the FastAPI/Jinja app; the task only requests a greeting module.

An isolated Pi 1.1.0 ran through `uv run --frozen` in each workspace, stdin
/dev/null, print/JSON mode, no session, and seven explicit tools:
read, grep, find, ls, bash, edit, write. Extension/skill/prompt/theme/MCP
discovery was disabled; context loading remained enabled. An explicit
observational recorder loaded in every run. Temporary profiles mirrored the
operator configuration. Workspace BashTool interpreter/import checks passed.
Instruction/profile hashes, tool schemas and request settings match across
all six attempts: max_tokens 16384, temperature 1, top_p .95, top_k 20.
The installed normal CLI remains 1.0.2; the source checkout was untouched.

Arms used the unchanged throwaway prototypes from the
[phase spike](2026-10-11-pi110-opt-in-guards.md): baseline recorder only;
discovery heuristically blocks broad shell scans and compacts large discovery
responses; timeout supplies 60 seconds when a bash timeout is omitted.
Explicit timeout values are preserved. Neither candidate changes the prompt.
Contracts were checked red/green during prototype construction and rerun for
this setup. No automatic .pi settings or extensions were installed.

Serial order: baseline-1, discovery-1, timeout-1, timeout-2, discovery-2,
baseline-2. Deadline 240 seconds; no seed or cache reset. Checks fixed before
trials require greeting behavior, passing generated tests, mutation sensitivity,
no existing file edits and a supported nonempty final report. Greeting case
and punctuation are unconstrained. Judge reviews were performed separately
after execution and did not guide the coding model.

## Results

| Arm | Repeat | Wall s | Requests | Peak tokens | Outcome |
|---|---:|---:|---:|---:|---|
| baseline | 1 | 17.74 | 13 | 5,283 | Complete/correct |
| baseline | 2 | 17.78 | 12 | 4,801 | Complete/correct |
| discovery | 1 | 2.97 | 2 | 2,816 | Empty provider final; no edits |
| discovery | 2 | 20.54 | 17 | 5,615 | Complete/correct; one scan blocked |
| timeout | 1 | 18.84 | 8 | 26,687 | Dependency scan; empty final; no edits |
| timeout | 2 | 3.04 | 2 | 2,807 | Empty provider final; no edits |

Three of six attempts completed correctly. Wall time includes startup;
peak tokens are reported input + cacheRead + output. Each process exited 0
and emitted agent_settled with aborted false, including incomplete attempts.

## Findings

1. **The successful code and tests are adequate for the loose request.**
   - Evidence: all three create hello.py with hello() returning a greeting,
     and tests/test_hello.py importing and asserting that behavior. Independent
     pytest and greeting probes pass. Replacing the production greeting with
     Goodbye! makes each unchanged generated test fail; the original is restored.
     No existing file, dependency or configuration changes. All three judges
     accept the code, test quality and final report.
   - Source: successful runs' output snapshots, independent-test.json,
     semantic-audit.json and judge-verdict.json.
   - Assessment: Fact. Mutation sensitivity is not evidence of agent TDD.

2. **The incomplete attempts end empty upstream of Pi normalization.**
   - Evidence: discovery-1 request 2, timeout-1 request 8 and timeout-2
     request 2 have 517, 457 and 454 reasoning characters respectively,
     whitespace-only visible content, finish_reason stop and zero tool-call
     deltas in SDK-parsed provider chunks. Native finals are also empty.
     No greeting/test artifacts exist; independent pytest exits 5. Judges
     reject completion. No discovery interception or timeout fired before
     these failures; timeout-1 only defaulted a fast find command.
   - Source: summary.json empty_provider_stops; corresponding trace/events,
     oracle and judge records.
   - Assessment: Fact about failure location. Extensions causing these
     failures is unproven; model versus server parsing remains unresolved.

3. **Seven tools do not guarantee discovery hygiene.**
   - Evidence: timeout-1 still scans dependencies, producing a 52,184-character
     serialized tool result and 26,687-token peak. Discovery-2 blocks
     `find . -type f | grep -v '/node_modules/'` and subsequently completes.
     The compact-output branch never activates. Baselines use dedicated
     discovery tools and keep peaks below 5,300, but still make 11–12 tool calls.
   - Source: calls/results in analysis.json; discovery-2 guard-events.jsonl.
   - Assessment: Fact about mechanism; n=2 does not establish guard benefit.

4. **Tool runtime is small; exploration adds model requests.**
   - Evidence: successful runs spend 0.397, 0.505 and 0.516 seconds in
     completed native tool executions, versus 17.084, 17.006 and 19.724
     seconds in native assistant responses. Baseline-1 rereads supplied
     AGENTS.md and attempts nonexistent workspace/AGENTS.md; baseline-2
     does neither. Both still complete. Discovery-2 rereads an empty .gitkeep.
   - Source: summary.json durations and calls; native durationMs events.
   - Assessment: Fact. Response time includes server/network time, not pure
     inference. Rereading is occasional overhead, not a demonstrated blocker.

## Recommendation and limits

Keep the neutral prompt, lean project notes and seven explicit CLI tools.
Do not add a hello-specific workflow or enforce red/green for this experiment.
The baseline's two successes are encouraging, not a reliability estimate.
Neither guard earned deployment from this small hello-world sample, and
timeouts addressed no observed long command here.

The most relevant unresolved failure is a provider-empty final. If another
experiment is warranted, test one bounded, explicit empty-final retry with
ordinary Pi instructions and tools. That is a candidate, not implemented or
validated recovery. Distinguish whitespace-only stops from meaningful replies,
retain both attempts, and judge delivered code rather than process exit.
For now, stop tuning hello world and carry recorder/scorer evidence into the
existing backlog; shipped Mode/Worker/OpenCode need their own measurements.

No causal Pi-version comparison is possible: prior runs differ in harness
environment, tasks and sampled trajectories. Six judges corroborate checks,
but deterministic artifacts and command results take precedence. The live
ac-demo retains only its prior AGENTS.md modification; experiments used copies.

## What would falsify this

A tool-call delta in a cited empty provider stop, existing-file changes in a
successful snapshot, or a generated test surviving the greeting mutation
would overturn the respective finding. More randomized repetitions could
establish guard or retry benefit absent from this sample.

## Risks

Local /tmp evidence is ephemeral; preserve it separately before durable
promotion. n=2, one backend/machine, sampled decoding and shared warm caches
limit comparisons. The discovery heuristic can block legitimate recursion;
empty-final retries may repeat failures or duplicate side effects. These
prototypes are research artifacts and do not establish cross-host behavior.
