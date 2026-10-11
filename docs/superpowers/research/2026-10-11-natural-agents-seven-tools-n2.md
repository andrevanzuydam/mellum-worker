# Seven built-in tools with natural AGENTS.md: n=2

**What is measured.** Two more bare-Pi trials in ac-demo with the same
approved project file, neutral prompt and judge rubric as the
[four-tool n=2 experiment](2026-10-11-natural-agents-n2.md), changing only the
selected tool set. One stopped with a module but no test or visible final;
one passed but made an unrestricted shell scan of .venv after misusing grep.

**What is conjecture.** General reliability or performance effects of the
tool set. n=2 per configuration, sampled decoding and uncontrolled cache
warmth do not establish a success-rate difference.

**Date:** 2026-10-11  
**Question:** Does offering Pi's ignore-aware built-in tools fix exploration
and completion under ordinary project instructions?  
**Scope:** ac-demo only; no red/green policy or shipped worker behavior change.

## Setup and sources

Paul supplied this interactive invocation:

```bash
uv run --frozen pi -ne -ns -np -t read,grep,find,ls,bash,edit,write --model omlx/Mellum2.1-12B-A2.5B-Thinking-6bit
```

The instrumented trials retained the previous print/JSON output, no-themes,
high-thinking, explicit recorder, session-directory and stdin-EOF settings.
The new --tools selection was the only experimental variable. Normal
context-file loading stayed on; AGENTS.md and the prompt were unchanged:
**Add a hello world module with a Python test.**

**Primary source:** Pi and launcher artifacts, inspected 2026-10-11, under
`/tmp/mellum-runs/natural-agents-n2-asucpry9/natural-agents-seven-tools-1/`
and `-2/`: command.json, trace.jsonl, events.jsonl, sessions/, result.json,
generated files under output/, independent test evidence and all judge files.
The experiment root holds unchanged context snapshots, baseline commit,
setup check and fixed judge rubric. Local raw evidence is not committed or
published yet.

Actual provider payloads offered read, grep, find, ls, bash, edit, write,
included the expected project file, and did not contain Pi's conditional
"Use bash for file operations like ls, rg, find" instruction. Global and
project files matched their snapshots at the end. Generated files/caches
were preserved and removed between trials; no tracked model changes occurred.

## Results

Time is prompt to final outer session-record timestamp. Context is peak
input + cacheRead, excluding output. Judging is excluded from these metrics.

| Configuration/trial | Completed task | Time s | Requests / calls | Peak input context |
| --- | --- | --- | --- | --- |
| four tools / 1 | no files, empty final | 6.565 | 6 / 5 | 3,194 |
| four tools / 2 | pass | 14.100 | 9 / 8 | 5,493 |
| seven tools / 1 | module only, empty final | 11.435 | 10 / 9 | 4,072 |
| seven tools / 2 | pass, large shell scan | 28.838 | 16 / 15 | 30,171 |

Seven-tool trial 1: 9,114 non-cached input, 1,308 output, 22,528 cache reads;
0.214 s approximate tool latency; no tool errors. It used ls 3, find 2,
read 2, grep 1, write 1. Its largest result was 422 characters. It reread
AGENTS.md. First write was at 10.497 s; hello_world.py defines hello()
returning `Hello, world!`, but no test or test command followed. Its final
visible text was whitespace. Pi exited 0, which again did not mean success.

Seven-tool trial 2: 40,334 non-cached input, 2,211 output, 234,496 cache reads;
0.328 s approximate tool latency; one tool error. It used ls 4, find 3,
read 3, grep 1, bash 2, write 2. First write was at 19.952 s.
It eventually wrote hello.py and tests/test_hello.py, ran the exact project
test command, and passed independent pytest (1 test). Its final accurately
reported the result. No dependency/configuration changes occurred.

## Findings

1. **Claim:** Safe discovery tools did not prevent fallback to an unsafe scan.
   - **Evidence:** Trial 2 called the built-in find several times but then
     sent `*.py` as grep's regex pattern. rg returned "repetition operator
     missing expression". A subsequent bash call ran
     `find . -name "*.py" 2>/dev/null || echo "No python files found"`.
     The received result was 51,316 characters of vendored paths, and
     reported input context peaked at 30,171 tokens.
   - **Assessment:** Fact about the sequence. The tools were available;
     the model confused filename glob discovery with content-regex search
     and kept searching despite an empty source tree being legitimate.
     The invalid grep was followed by the shell scan, but does not alone
     prove the cause of that decision.
2. **Claim:** Pi's default bash-search rule is not necessary for this failure.
   - **Evidence:** Both captured system prompts lacked that rule. Trial 2
     nevertheless ran the unfiltered shell find.
   - **Assessment:** Fact falsifying a stronger sole-cause interpretation of
     the [earlier whack-a-mole analysis](2026-10-11-bare-pi-whack-a-mole.md).
     Tool selection remains a plausible contributor, not a guarantee.
3. **Claim:** Adding tools did not eliminate incomplete final turns here.
   - **Evidence:** Trial 1 stopped after creating only a module. Neither
     the requested test nor a visible final report existed.
   - **Assessment:** Fact for this sample. Both tool configurations observed
     one completed task out of two; no population-rate claim follows.

## Generated code and judge assessment

The same independent DeepSeek Flash rubric returned fail for trial 1 and
pass for trial 2. Trial 1's module was valid, but the deliverable lacked its
test. Trial 2's test imports and calls the real generated greeting function;
independent execution supports its pass verdict. Optional annotations and
docstrings are not requirements.

The judge's minor comment that trial 2 had "no blank line after the import"
was incorrect: it had one blank line, rather than the conventional two.
The failed trial's report was missing, not a false success claim. These are
reasons to inspect judge comments rather than accepting every label literally;
they do not change the independently supported pass/fail outcomes.

## Recommendation

Do not describe the seven-tool flag as a fix. Keep the candidate project
file and evidence, and avoid adding per-tool prohibitions to AGENTS.md.
The observed repeated discovery and missing completion matter more than
adding another noun or exception to the standing instructions.

Next useful comparison: return to four tools and try the original natural
request, "Write a hello world module then write a Python test for it",
with the same general AGENTS.md and n=2. That isolates the request wording
relative to the neutral-prompt condition instead of assuming that the whole
candidate bundle helped. Preserve both conditions and reuse the same code
rubric; do not introduce TDD in that comparison.

For the later Mode demo, its existing empty-final nudge is an explicit
behavior difference worth showing. It is not part of these bare-Pi trials.
No further run variant was applied here. ac-demo retains only the approved,
uncommitted AGENTS.md change; generated files are archived outside the tree.

## What would falsify this

**Round-one follow-up:** All five n=2 conditions, the original-prompt and
layout trials, search-scope results, and the final disposition are recorded
in the [round-one verdict](2026-10-11-bare-pi-round-one-verdict.md). No
red-green policy or shipped behavior change was made.

- Larger matched repetitions show a reliable tool-set effect on completion
  and large-result avoidance, changing the provisional recommendation.
- The original wording produces the same uncertainty and stalls, weakening
  the hypothesis that request wording helps execution order.
- Independent tests or source inspection contradict either judge verdict.

## Risks

- Small grouped samples and uncontrolled cache warmth limit comparisons.
- A safer find tool does not constrain the still-available bash tool.
- Judge comments can be factually wrong despite a supported overall verdict.
- These outcomes concern one blank-project task, not AgentClinic phase
  development or the shipped Pi/OpenCode worker paths.
