# Natural AGENTS.md and neutral hello-world prompt: n=2

**What is measured.** Two fresh bare-Pi sessions from ac-demo using the
approved general AGENTS.md and neutral task prompt, with four default tools.
Provider requests, session events and generated files were captured. One
attempt produced no files; the other passed its own and independent pytest
runs. Separate DeepSeek Flash invocations judged both completed attempts.

**What is conjecture.** Whether shorter instructions improve performance or
reliability, or whether seven built-in tools would avoid the observed empty
final. Two repetitions cannot establish those claims.

**Date:** 2026-10-11  
**Question:** How does bare Mellum behave with ordinary project instructions
and a neutral request, without a red/green policy?  
**Scope:** ac-demo experiments only; no worker prompt, guards, template or
shipped software change. Paul authorized the combined candidate and n=2.

## Configuration and provenance

Prompt: **Add a hello world module with a Python test.**

Installed ac-demo AGENTS.md, 422 characters:

```markdown
# AgentClinic — agent notes

A small FastAPI + Jinja2 complaints app. The phased requirements are in
specs/roadmap.md.

## Mellum

- Test command: uv run --frozen python -m pytest tests
- Run Python commands with uv run --frozen.
- Use existing dependencies and test configuration.
- Keep changes scoped to the task; do not weaken existing tests.
- Before reporting completion, run the test command and report its result.
```

Pi 1.0.2, oMLX Mellum2.1-12B-A2.5B-Thinking-6bit, high thinking;
`uv run --frozen pi -p --mode json`, with no discovered extensions,
skills, prompt templates or themes, and the ladder recorder explicitly
loaded. Normal context-file discovery remained on. Four tools were verified
in the provider payload: read, bash, edit, write. No red/green instruction.
Fresh session per run, 180 s deadline; neither timed out.

**Primary sources:** Pi/launcher artifacts and generated files, inspected
2026-10-11, under `/tmp/mellum-runs/natural-agents-n2-asucpry9/`:

- `AGENTS-before.md`, `AGENTS-candidate.md`, `global.md`, `baseline-head.txt`,
  prompt.txt, versions.json and setup-check.json preserve the setup.
- `natural-agents-four-tools-1/` and `-2/` hold exact command.json,
  trace.jsonl, events.jsonl, sessions/, result.json, workspace status/diff,
  and any generated files under output/.
- `judge-rubric.md` was written before the runs. Each run preserves the
  independent judge input, command, trace, response, parsed verdict and usage.

The first captured requests contained the expected project and global files;
live files still matched those snapshots at the end. The setup check passed.
The starting tree was clean. Between runs, generated source/test files and
caches were archived, not broadly removed with git clean. A pre-existing
tracked diff consisting only of the approved AGENTS.md change was used as
the baseline for detecting model changes. No model changed a tracked file.

The candidate and prompt changed together relative to earlier probes. This
is an experiment on a disclosed bundle, not causal attribution to one line.
Cache warmth was not controlled; decoding is sampled. Raw local artifacts
have not been published and are not committed into the research note.

## Outcomes and telemetry

Elapsed is outer session-record timestamp of the prompt to the final model
response; launch wall also includes startup. Peak context excludes output:
input + cacheRead. Judge requests are excluded from Mellum telemetry.

| Metric | Trial 1 | Trial 2 |
| --- | --- | --- |
| Prompt to final response | 6.565 s | 14.100 s |
| Launcher wall | 6.778 s | 14.345 s |
| Provider requests | 6 | 9 |
| Tool calls | 5: bash 4, read 1 | 8: bash 4, read 2, write 2 |
| Approximate tool latency | 0.085 s | 0.299 s |
| Peak input context | 3,194 tokens | 5,493 tokens |
| Non-cached input | 6,405 | 9,976 |
| Output | 723 | 1,632 |
| Cache reads | 9,216 | 23,552 |
| Largest tool-result text | 758 characters | 2,892 characters |
| AGENTS.md rereads | 0 | 0 |
| Tool errors | 0 | 0 |
| Pi exit / final stop reason | 0 / stop | 0 / stop |
| Generated files | none | hello.py, tests/test_hello.py |
| Independent pytest | not run: no test created | 1 passed |
| Independent judge | fail | pass |

1. **Claim:** Trial 1 failed by stopping before implementation.
   - **Evidence:** It called ls, a maxdepth-2 find, ls tests, ls specs and
     read pyproject.toml. The final response contained internal reasoning
     planning another search, whitespace visible text and no tool call.
     No write, edit or test command occurred. Final output was 216 tokens
     with stop reason stop, not length; the launcher did not time out.
   - **Assessment:** Fact about the received final-turn shape, not a proof
     of the underlying model/parser cause. Pi exit 0 is not task success.
     This matches the empty-final failure class already seen in the
     [plain-primary ladder](../../ladder/phase0c-primary-plain/README.md).
2. **Claim:** Trial 2 completed the requested behavior correctly.
   - **Evidence:** It inspected the directory and tests, read the roadmap
     and pyproject, wrote the two files, ran the exact project test command
     successfully, then listed the directory before its accurate final.
     Independent pytest also passed; source and test were inspected.
   - **Assessment:** Fact. First write at 9.331 s, so exploration still
     consumed most of the time before implementation.
3. **Claim:** Neither trial suffered the earlier large-result context spike.
   - **Evidence:** Trial 1 used find with maxdepth 2; trial 2 did not use
     find. The largest received results were small, and neither reread
     AGENTS.md. Trial 2's largest result was the roadmap.
   - **Assessment:** Fact for these trials. It does not establish that the
     new wording prevents unfiltered traversal in other runs.

## Generated code and independent judging

Trial 2's module contains hello() returning `Hello, World!`; its test imports
hello from that module and asserts the exact returned greeting. Both files
have final newlines. One blank line rather than two before the test function
and missing return annotations are minor style matters, not failures.
No CLI printing behavior or TDD order was required by the task.

The judge used `deepseek/deepseek-flash` through a separate headless Pi with
no tools, extensions other than the recorder, skills or context files. It saw
the same fixed rubric, task, project policy, generated files, tool outcomes,
visible final response and independent-test result for each trial. It did
not see timing or which attempt was supposed to be better. Filenames,
function names and greeting capitalization were not prescribed by the rubric.
This is independent model review, not a replacement for executing tests.

Its verdict for trial 1 was fail because no module, test or report existed.
Trial 2 passed: the test exercised real module behavior and the report matched
the recorded successful command. The judge's remark that the test has one
happy-path assertion is not an actionable issue for this tiny contract.
The failed trial made no false success claim; it omitted the deliverable
and report entirely.

Judge invocations took 2.965 and 3.230 seconds including startup; reported
costs were $0.0010212 and $0.001375104 (about $0.0024 total), separate from
zero reported local-model cost. Inputs/outputs, model and rubric are preserved
so later comparisons can use the same evaluation procedure.

## Recommendation

Observed result: **one completed attempt out of two**. Low context in a failed
attempt is not an efficiency win. Keep the approved project file for the next
comparison, but do not declare it a reliability improvement.

Next compare the same prompt, files and rubric with Pi's seven built-in tools,
n=2. This is a documented host configuration, not a task-specific instruction.
It may help discovery, but the empty-final failure is a separate concern and
bash can still traverse ignored directories. Keep completion scoring based
on deliverables/tests, not process exit. Do not add a special AGENTS.md
instruction for this one empty final; the shipped Mode already has a guard
for that failure class. A later Mode demo can compare that behavior honestly.

No further variant or TDD policy was applied during this experiment. The
candidate AGENTS.md remains installed and uncommitted in ac-demo; generated
files are archived and the workspace otherwise reset for the next run.

## What would falsify this

**Round-one follow-up:** All five n=2 conditions, the original-prompt and
layout trials, search-scope results, and the final disposition are recorded
in the [round-one verdict](2026-10-11-bare-pi-round-one-verdict.md). No
red-green policy or shipped behavior change was made.

**Follow-up:** The recommended seven-tool n=2 comparison was run with the
same wording and rubric: one incomplete attempt and one passing attempt
that still swept .venv via bash. See the
[comparison](2026-10-11-natural-agents-seven-tools-n2.md). The tool flag is
not demonstrated as a retrieval or completion fix.

- Follow-up runs show large ignored-directory results under this candidate,
  falsifying any stronger retrieval-hygiene claim.
- Seven-tool repetitions still stall or produce empty finals; offering tools
  does not solve the observed completion failure.
- Independent behavior checks or later code review contradict the passing
  generated-code assessment.

## Risks

- n=2 reveals variability, not a reliable success-rate estimate.
- The candidate, prompt, history and cache conditions differ from the original
  interactive session. Do not attribute differences to one changed sentence.
- A judge can miss problems or overstate trivial issues. Preserve evidence
  and retain independent execution and human assessment.
- This hello-world experiment does not validate the simplified policy on the
  actual four AgentClinic phases, or on the shipped Pi/OpenCode worker paths.
