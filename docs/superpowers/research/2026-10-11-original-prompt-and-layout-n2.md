# Original wording and an ordinary layout fact: bare Pi n=2

**What is measured.** Two original-prompt trials with the general project
instructions, followed by two neutral-prompt trials adding a layout fact.
All four delivered correct modules/tests and passed independent execution
and a separate model judge. All four scanned .venv through shell find.

**What is conjecture.** Whether wording or layout improves completion.
These small sampled groups, with uncontrolled cache warmth, cannot establish
rates or causal effects. Completion does not establish efficient retrieval.

**Date:** 2026-10-11  
**Question:** Does natural task wording or a conventional layout fact address
the uncertainty and repeated discovery seen in earlier trials?  
**Scope:** ac-demo, bare Pi, no red/green instruction; no shipped changes.

## Setup and sources

The baseline is the [general candidate](2026-10-11-natural-agents-n2.md):
documented uv environment/test command, existing configuration, task scope
and a requirement to run/report tests. Normal Pi context discovery loads
both the shortened global file and project file. No CLI append of AGENTS.md.
Four tools: read, bash, edit, write. Pi 1.0.2, local oMLX Mellum2.1-12B-
A2.5B-Thinking-6bit, high thinking; recorder only, fresh headless session,
stdin EOF, 180-second deadline. No timeout or launcher error occurred.

Original condition: **Write a hello world module then write a Python test
for it.** No project instruction change from the earlier four-tool baseline.

Layout condition: **Add a hello world module with a Python test.** Add only:
"Layout: Python modules at the repository root; tests in tests/; templates
in templates/." Compare this against the neutral-prompt four-tool baseline,
not against original wording as though only one variable differed.

**Primary sources:** Pi/launcher artifacts, inspected 2026-10-11, at
`/tmp/mellum-runs/natural-agents-n2-asucpry9/`: subdirectories
`natural-agents-original-prompt-four-tools-{1,2}` and
`natural-agents-layout-four-tools-{1,2}`. Each contains command/context
snapshots, trace.jsonl, events.jsonl, session JSONL, result.json, analysis.json,
generated output, independent pytest and separate judge inputs/verdicts.
The root preserves AGENTS-candidate.md, AGENTS-layout.md, global.md,
judge-rubric.md, baseline-head.txt and summarize.py. These local sources are
not yet a durable published artifact; raw traces are not committed.

Expected global/project snapshots appeared in each first provider payload.
Live snapshots were checked between runs. Generated files/caches were
archived and removed, preserving the intended AGENTS.md tracked diff.

## Results

Times use outer session-record timestamps, prompt to final assistant record;
assistant message.timestamp can refer to generation start. Context is input
plus cacheRead, excluding output. Judge calls are excluded.

| Condition / trial | Time s | Requests / calls | First write s | Peak input context | Code/test/judge |
| --- | --- | --- | --- | --- | --- |
| Original / 1 | 18.591 | 10 / 9 | 14.807 | 25,027 | pass |
| Original / 2 | 19.368 | 8 / 7 | 14.950 | 24,469 | pass |
| Layout / 1 | 18.809 | 12 / 11 | 13.235 | 24,827 | pass |
| Layout / 2 | 23.018 | 11 / 10 | 15.999 | 24,821 | pass |

All four returned a 51,288-character result from unrestricted
`find . -name "*.py" -o -name "*.pyi"`. Approximate assistant-complete to
tool-result gaps totaled 0.311, 0.290, 0.312 and 0.372 seconds respectively.
These gaps do not measure prefill/inference separately. No AGENTS.md reread
occurred in these four runs.

Original trials used bash 6/read 1/write 2 and bash 4/read 1/write 2.
Their non-cached input/output/cache-read totals were respectively
28,983/1,469/168,960 and 28,251/1,508/98,304.
Layout trials used bash 6/read 3/write 2 and bash 7/read 1/write 2;
totals 29,919/1,405/153,600 and 30,345/1,648/107,520.

## Findings

1. **Claim:** Original wording completed twice but retained the large scan.
   - **Evidence:** Both generated a greeting function and real importing
     test, ran the exact project test command, and reported success accurately.
     Independent pytest and fixed-rubric DeepSeek Flash judgments passed.
   - **Assessment:** Fact for these trials. Earlier neutral wording completed
     once out of two; do not infer a population-rate advantage.
2. **Claim:** The layout fact was understood but did not stop overexploration.
   - **Evidence:** Layout trial 1's thinking explicitly cites the root layout,
     recognizes that there are no root modules, then asks to list files
     "more comprehensively" and recursively scans dependencies anyway.
     Trial 2 similarly recognizes the empty tests/root and keeps searching.
   - **Assessment:** Fact about recorded sequence. An inference is that the
     failure involves deciding when discovery is sufficient, beyond missing
     knowledge of the intended layout.
3. **Claim:** Not every tool error represents broken code.
   - **Evidence:** Both layout trials' `ls *.py` variants exited 1 because no
     module existed yet. Trial 2 also read the tests directory as a file,
     receiving EISDIR, then repeated its directory listing. Tests passed.
   - **Assessment:** Fact. Track negative lookups, tool misuse and failing
     behavior tests separately when designing eval labels.
4. **Claim:** Environment guidance is followed inconsistently.
   - **Evidence:** Layout trial 2 ran the prescribed uv test command, then
     bare `python -c` to import the greeting successfully. uv's launcher PATH
     made an interpreter available; the success is not proof of an environment
     portable command. No dependency or configuration changes occurred.
   - **Assessment:** Fact; an additional example for environment-policy
     evaluation, not a code-correctness failure.

## Generated code and judging

The modules have hello() returning `Hello, World!`; tests import/call that
function and compare the result. Original trial 2 chose hello_world.py and
test_hello_world.py; other trials used hello.py and test_hello.py. The request
did not prescribe filenames, annotations, docstrings or printing on execution.
All have final newlines. One blank line rather than the conventional two
before a top-level test is minor formatting. More cases would not materially
improve this tiny behavior check. No red-to-green cycle was required or shown.

The independent judge used the pre-existing rubric and saw generated files,
tool outcomes, final report and independent test evidence, but no timing.
Its four pass verdicts agree with execution and source inspection. Optional
docstrings/annotations and illustrative filename comments in a final answer
are not material defects. Exact input, command, model, usage and response are
preserved beside each attempt.

## Recommendation

Keep the original prompt as the honest first-video baseline. Do not retain
the layout bullet as a measured retrieval remedy: both trials contradicted
that expectation. It is reasonable project documentation, but unnecessary
for this two-file task. Do not add a special AGENTS.md no-reread instruction.

One last bounded comparison will add only ordinary search-scope guidance:
exclude virtual environments and generated files from repository searches.
Use original wording and four tools, n=2, so the project bullet is the sole
changed experimental variable. This supplies no solution or tool sequence.
Preserve any failure and stop this round after that comparison; repeated
hello-world tuning needs transfer tasks before a product claim.

## What would falsify this

- Larger matched trials establish a repeatable layout or wording effect.
- A search-scope instruction still produces vendored scans or incomplete
  turns, weakening text-only remediation.
- Independent execution/source inspection contradicts a passing verdict.

## Risks

- n=2 per grouped condition and uncontrolled server cache limit inference.
- Natural instructions can still overfit a single demo after many revisions.
- Successful code does not excuse unnecessary discovery or policy deviations.
- Bare Pi evidence does not validate Pi Mode, Pi Worker or OpenCode changes.
