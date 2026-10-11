# Bare Pi natural-instruction experiments: round-one verdict

**What is measured.** Ten attempts, five conditions with n=2 each, in clean
ac-demo starting states. Eight completed the requested module and behavior
test; two stopped unfinished. All eight completed attempts passed independent
pytest and the separate DeepSeek Flash code judge. Seven tools and text-only
layout/search guidance did not consistently prevent dependency scans.

**What is conjecture.** Success rates, a best prompt/tool set, and transfer to
AgentClinic phase tasks or shipped workers. These grouped small samples
cannot establish those claims. This is a completed exploratory round, not a
benchmark victory or a selected fastest take.

**Date:** 2026-10-11  
**Question:** Which ordinary project guidance is defensible for the first
bare-Pi video, and which lessons deserve subsequent eval/product work?  
**Scope:** bare Pi with local Mellum in ac-demo; no TDD, worker prompt,
templates, guards, setup/learn or global configuration change in this round.

## Evidence and comparison

**Sources:** Launcher, Pi and judge artifacts, inspected 2026-10-11, under
`/tmp/mellum-runs/natural-agents-n2-asucpry9/`. comparison.json and each
analysis.json are derived by summarize.py from the outer session timestamps,
usage and recorder payloads. Each condition retains command/context snapshots,
trace/events/session logs, generated files, independent tests, and exact judge
input/model/usage/output. All first payloads contained their expected project
and global files; seven-tool payloads offered seven tools and lacked Pi's
conditional bash-search rule. Raw evidence is local, unpublished, and not in git.

The fixed judge rubric predates the runs. It requires a greeting module, a
test exercising that module, narrow scope and an accurate report. It does not
require exact filenames, a printing CLI, docstrings, annotations or TDD.
The judge sees code/tool/report evidence but no speed information. Its code
assessment is checked against source and independent execution.

All conditions use Pi 1.0.2, oMLX Mellum2.1-12B-A2.5B-Thinking-6bit, high
thinking, fresh sessions and normal context-file discovery. No discovered
extensions/skills/templates/themes; the explicit recorder observes requests.
Sampling and server settings remained unchanged, but cache warmth was not
controlled. Generated files/caches were archived between attempts, retaining
only the expected project-instruction diff. No model edited tracked files.

| Condition | Completed | Prompt→final s, trials 1 / 2 | Peak input tokens, 1 / 2 | Large .venv result |
| --- | --- | --- | --- | --- |
| General guidance, neutral prompt, four tools | 1/2 | 6.565 / 14.100 | 3,194 / 5,493 | 0/2 |
| Same, seven tools | 1/2 | 11.435 / 28.838 | 4,072 / 30,171 | 1/2 |
| General guidance, original prompt, four tools | 2/2 | 18.591 / 19.368 | 25,027 / 24,469 | 2/2 |
| General + layout, neutral prompt, four tools | 2/2 | 18.809 / 23.018 | 24,827 / 24,821 | 2/2 |
| General + search scope, original prompt, four tools | 2/2 | 10.818 / 18.950 | 3,829 / 24,211 | 1/2 |

Neutral: **Add a hello world module with a Python test.**
Original: **Write a hello world module then write a Python test for it.**
Read each comparison against its matching baseline; layout and original
wording differ in two variables and are not a matched pair.

Detailed records:
[general four tools](2026-10-11-natural-agents-n2.md),
[seven tools](2026-10-11-natural-agents-seven-tools-n2.md),
[original wording and layout](2026-10-11-original-prompt-and-layout-n2.md).

## Final search-scope comparison

Only added bullet: **Exclude virtual environments and generated files from
repository searches.** Original prompt and four tools, no layout bullet.
This is general engineering guidance, with no solution or prescribed command.

Trial 1: 9 requests, bash 4/read 2/write 2, first write at 6.839 s,
approximately 0.215 s total tool gaps, 7,868 non-cached input/1,236 output/
18,432 cache-read tokens. Largest result 758 characters, one AGENTS.md reread,
no tool error. It wrote hello_world.py and a real importing test; recorded
and independent pytest passed. Final report and judge passed.

Trial 2: 8 requests, bash 5/write 2, first write at 14.197 s,
approximately 0.300 s total tool gaps, 28,346 input/1,413 output/117,760 cache
reads. It ran unrestricted `find . -name "*.py"`, receiving 51,316 characters,
then listed tests twice using different commands. No AGENTS.md reread or tool
error. The generated module/test and report passed execution and judging,
but repository searching violated the added instruction.

Both Pi processes exited 0 with final stop; no timeout. The second trial
falsifies a guarantee from this wording. The first shows a possible benefit,
not a demonstrated rate improvement. The judge also remarked that a literal
greeting assertion leaves no margin for capitalization; that is not an
actionable defect when the test checks this module's exact intended behavior.

## Lessons and disposition

1. **Claim:** AGENTS.md rereads are not the main measured cost.
   - **Evidence:** Only two of these ten attempts reread it. One was an
     incomplete seven-tool attempt; one was the fast successful search-scope
     attempt. Normal Pi discovery had already supplied it in every run.
   - **Assessment:** Fact for this sample. Reading local rules is reasonable
     orientation in general; no special no-reread policy is justified here.
2. **Claim:** Pi's bash-search rule is not a sole root cause.
   - **Evidence:** A seven-tool request lacked that rule, but still made the
     giant shell scan after supplying a filename glob as grep's regex.
   - **Assessment:** Fact correcting the stronger reading of the earlier
     whack-a-mole note. Offering ignore-aware tools is sensible but insufficient.
3. **Claim:** Empty finals require outcome checks beyond exit status.
   - **Evidence:** Two runs exited 0 and stop with whitespace final text;
     one wrote nothing, one wrote a module but no test. The judge failed both.
   - **Assessment:** Fact. This matches an existing ladder/guard failure class;
     preserve it as a regression example, rather than inventing another rule.
4. **Claim:** Correctness and process adherence are distinct.
   - **Evidence:** All eight completed attempts produced a greeting function
     and importing assertion. One also ran bare python despite the uv policy;
     another ignored the search-scope bullet. Tests/report were still correct.
   - **Assessment:** Fact. Separate code, environment, retrieval and completion
     scores; no fake test pass or missing behavior test was accepted.

## Recommendation and transfer

Restore the approved 422-character general AGENTS.md without layout or search
scope additions. It states the test/environment/configuration/scope/report
conventions, removes the future app.py example, and supplies no solution.
Keep the original sentence for the first video. The neutral variant remains
recorded, including its failure. Seven tools are an honest optional Pi setup,
but were not demonstrated as a fix or superior default here. Show the actual
attempt rather than imply that text refinement guarantees a clean run.

Do not add red-green guidance yet. A short test-first policy can be a later
separate comparison with neutral wording and an existing behavior-change
task; score expected behavioral assertion failure followed by green apart
from collection/import/environment failures. This round only measures final
correctness and completed reporting.

Concrete downstream work, recorded in BACKLOG.md rather than shipped now:

- **Eval labels:** legitimate empty source tree, filename-glob/content-regex
  confusion, ignored-directory result size, repeated discovery after enough
  evidence, empty final, environment adherence and report accuracy. Preserve
  the existing exit-code-versus-completion distinction. A candidate benchmark
  should include an existing-module task as well as a blank project.
- **Facts/setup/learn:** retain uv guidance as a general command convention;
  do not suggest a future filename or claim a search bullet reliably fixes
  scans. Existing A21/facts work is the promotion point, with host checks.
- **Pi Mode:** assess these failure classes through the shipped one-shot
  command, facts injection, recorder and existing empty-final guard. Compare
  recorded outcomes against bare Pi; do not call the guard bare behavior.
- **Pi Worker:** ensure parent briefs pass environment/test facts and verify
  child deliverables, not merely child exit. Existing fallback-command work
  covers the omitted-facts case.
- **OpenCode:** verify the actual prompt/facts/tool/error path and repeat
  applicable ladder/host checks. A Pi-specific tool flag cannot be assumed
  to transfer. Shared prompts regenerate both templates only after measurement.

No shared prompt, guard, template, eval implementation or release was changed.
This round ends here to avoid accumulating instructions around one tiny task.
Confidence: high in observed failure sequences and code assessments; low in
the ranking of alternative setups. Next substantive measurement should use
transfer tasks or the separately scoped TDD comparison.

## What would falsify this

**Deeper review:** The [evidence audit](2026-10-11-bare-pi-deep-dive.md) adds
per-turn context attribution, .git leakage from broad built-in discovery,
empty-final instrumentation limits, and eight direct/mutation code checks.
It clarifies that original wording is a continuity choice, not a demonstrated
reliability improvement, and that earlier independent pytest reran model tests.

- Larger matched trials demonstrate a repeatable benefit from layout, tool
  selection or search guidance on multiple tasks.
- Source inspection or execution contradicts a code/judge pass.
- General project guidance weakens scope/configuration discipline on real
  AgentClinic phases, requiring reconsideration of the removed specifics.
- Shipped host traces show different failure mechanisms, defeating transfer.

## Risks

- n=2, grouped trial order and uncontrolled cache are not a success-rate study.
- Repeated demo tuning can overfit, even when each individual rule is ordinary.
- Tool latency gaps do not allocate elapsed time between decoding and prefill;
  earlier percentage claims should not be reused as measured attribution.
- Judge minor findings can be wrong or irrelevant; retain execution/evidence.
- Local raw evidence can disappear; durable/publication claims await archiving.
