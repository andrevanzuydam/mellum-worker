# Bare Pi round one: deeper evidence review

**What is measured.** Reinspection of all ten existing trials, including the
per-turn provider payloads and streamed Pi events. New direct behavior probes
and mutation checks on temporary copies of the eight completed artifacts
passed: each real greeting worked, and each unchanged test rejected a wrong
greeting with an assertion failure. No additional model trial was launched.

**What is conjecture.** A unique root cause for empty finals, the best prompt
or tool set, a text-only cure for overexploration, or a shipped-host benefit.
The earlier recommendation to keep original wording is a continuity and
simplicity decision, not evidence of a statistically superior prompt.

**Date:** 2026-10-11  
**Question:** Which round-one conclusions survive closer examination, and
which natural remedies and downstream investigations follow?  
**Scope:** Existing bare-Pi evidence and archived code, no TDD or product changes.

## Sources and method

Primary source: Pi, launcher and judge artifacts under
`/tmp/mellum-runs/natural-agents-n2-asucpry9/`, inspected 2026-10-11.
The [round-one verdict](2026-10-11-bare-pi-round-one-verdict.md) records
conditions, starting commit, snapshots and all outcomes. This review adds
deep-analyze.py, deep-analysis.json, code-audit-summary.json and each
completed run's code-audit.json. The audit copies source/tests/configuration
to a temporary directory, uses ac-demo's existing Python interpreter, runs
an independently authored direct-call assertion, reruns the generated test,
then substitutes `WRONG GREETING` in the module and reruns the unchanged test.
The wrong-result failures were assertions, not import/collection failures.
Temporary copies were removed; original artifacts and live source were untouched.

Pi's exact installed 1.0.2 tool code was also read under
`/Users/pauleveritt/.volta/tools/image/packages/@earendil-works/pi-coding-agent/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/tools/`:
find.js, default fd argument construction; bash.js, truncation notices.
Captured tool schemas are the authoritative descriptions offered to this model.
The indexed [Pi v1.0.0 changelog](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/CHANGELOG.md)
(earendil-works, accessed 2026-10-11; 0.13.2 Changed and 0.67.6 Fixed)
corroborates tail truncation and fd ignore handling, but is an earlier
version than the actual installed tool inspected here.

Source for recorder limits: ladder/ladder/record-pi.js, the three event
handlers. It captures requests and tools, not the raw provider response stream.
Source for guard applicability: extensions/mellum-guards.ts,
isEmptyAssistantTurn, createEmptyFinalNudge and createLoopBreaker.
Source for host differences: opencode/plugin.js and
templates/opencode/mellum-worker.md. Local raw evidence remains unpublished.

Paul subsequently supplied `/Users/pauleveritt/PyCharmProjects/pi`. Its
working checkout is at 914cf1472 (release 0.84.2), but local refs contain
v1.0.2. Matching-tag files were read with git show; neither the branch nor
working files changed. Additional primary sources, accessed 2026-10-11:
[provider adapter](https://github.com/earendil-works/pi/blob/v1.0.2/packages/ai/src/api/openai-completions.ts),
[agent loop](https://github.com/earendil-works/pi/blob/v1.0.2/packages/agent/src/agent-loop.ts),
and [extension event types](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/src/core/extensions/types.ts).
Pinpoints: adapter lines 557–684, agent loop runLoop, ProviderStreamEvent
lines 900–908. The installed declarations/adapter confirm that the
provider-stream hook is present in the binary used for the trials.

## Findings

1. **Claim: Code generation succeeds more clearly than full agent execution.**
   - **Evidence:** Eight completed attempts have correct greeting functions
     and importing assertions. All eight pass direct-call probes, generated
     tests and the original model judge; all eight tests reject a wrong return.
     The other two attempts stopped before delivering the complete task.
   - **Assessment:** Fact. These failures do not show inability to write this
     tiny function; they show failure to reliably carry the task through.
     This does not predict correctness on a nontrivial FastAPI phase.

2. **Claim: The test-quality finding is now stronger than a rerun alone.**
   - **Evidence:** Earlier "independent pytest" meant independent execution
     of model-authored tests, not an independently authored oracle. This new
     check directly calls each function and tests assertion sensitivity by
     changing only its return. All eight mutate-to-fail as expected.
   - **Assessment:** Fact and clarification. No test was disconnected from
     the module. A single assertion is sufficient for this constant greeting.
     The audit is post-hoc validation, not evidence of agent-performed TDD.

3. **Claim: Large results cause demonstrable persistent request growth.**
   - **Evidence:** Original-prompt trial 1: request 2 has 2,367 input-context
     tokens; after find, request 3 has 23,335, a rise of 20,968. The same
     51,288-character tool message appears in requests 3 through 10. The
     other five scans produce request rises between 20,843 and 20,992 tokens.
   - **Assessment:** Fact about complete requests; the deltas include framing
     and the preceding assistant turn, so are not exact standalone tool-token
     counts. The giant path list dominates the growth nonetheless.
     Cache reads report reuse, not disappearance from context.

4. **Claim: Existing output truncation is insufficient for this discovery task.**
   - **Evidence:** Pi's notices say "50.0KB limit" and show only the tail:
     lines 907–1744 or 890–1726. Full output is saved outside the prompt.
     The truncated result alone drives the approximately 21k-token increase.
   - **Assessment:** Fact. "Add a cap" is an incomplete diagnosis: a cap
     already exists. Filename discovery needs appropriate scope and a much
     more useful result than a tail of vendored filenames. Choosing another
     general cap remains unmeasured; silent truncation could hide needed data.

5. **Claim: Tool availability and repository-source scope are separate.**
   - **Evidence:** Seven-tool trial 2's built-in find for `*.py` twice reports
     no files. A broad find for `*` instead returns 6,672 characters including
     .git objects/hooks/logs/receipts. The next request grows from 3,001 to
     7,471 tokens, before the separate .venv shell scan. Installed find.js
     uses fd with --hidden and no explicit .git exclusion on its default path.
   - **Assessment:** Fact about this installed tool and trace. Respecting
     .gitignore avoided the virtual environment, but did not make broad
     discovery a source-only inventory. The trace does not prove all fd or
     Pi versions share this behavior.

6. **Claim: Mellum often has enough information but keeps checking.**
   - **Evidence:** Layout trial 1 explicitly recognizes no root modules and
     cites the supplied root layout, then asks for a "more comprehensive"
     listing. Seven-tool trial 2 has two successful empty Python searches,
     confuses a filename glob with a content regex, gets a parse error,
     repeats find, and escalates to bash find. Its reasoning later recognizes
     the result as installed dependencies rather than project code.
   - **Assessment:** Fact about sequence; an inference is that discovery
     termination and negative-result interpretation are central problems.
     Missing app.py and absent safe tools were contributors in earlier runs,
     not sufficient explanations for the pattern across these variants.

7. **Claim: Most elapsed time precedes implementation; shell time is small.**
   - **Evidence:** In the eight completed runs, 4–8 discovery calls precede
     the first write. First write dispatch occurs 63–80% through total
     prompt-to-final time, including generation of that first write request.
     Approximate tool gaps are 1.1–2.1% of elapsed time across all ten runs.
     Successful scanned attempts have median 19.159 s (n=6); the two
     successful small-context attempts have median 12.459 s.
   - **Assessment:** Fact for timing measurements, descriptive association
     for those medians. The groups differ in wording/tools/call counts/cache;
     do not claim the scan caused a measured 6.7-second overhead or that the
     remaining elapsed time is separately measured GPU inference.

8. **Claim: Empty finals are real received events, but their underlying layer
   is unresolved.**
   - **Evidence:** Failed four-tool trial: 216 output tokens with reasoning
     planning another search, whitespace text, stop/rawStopReason stop, no
     final-turn tool event. Failed seven-tool trial: 102 output tokens with
     reasoning planning the test write, same whitespace/stop shape. Both
     emit message_end, turn_end, agent_end and agent_settled. Neither is a
     deadline, length stop, context overflow or captured tool exception.
     Requests specify max_tokens 16,384 and thinking enabled.
   - **Assessment:** Fact at the Pi event boundary. Model generation, server
     tool-call conversion and client parsing cannot be conclusively separated
     by this recorder. Capture one raw provider response alongside parsed
     events before assigning a unique defect to Mellum or Pi.

   - **Matching-source follow-up:** The adapter emits a provider-stream hook
     before processing each OpenAI chunk, parses reasoning separately from
     `delta.tool_calls`, and maps finish_reason stop to stop. The agent loop
     continues for parsed calls, steering/follow-up messages or an explicit
     continuation; otherwise it ends. There is no default semantic check that
     internal reasoning describes unfinished work. This explains the observed
     stop mechanically, but does not prove which upstream layer omitted the
     call. `provider_stream_event` exposes parsed SDK chunks before Pi
     normalization, not raw model tokens or the exact HTTP byte stream.

9. **Claim: Existing Pi guards cover one failure class, not all discovery.**
   - **Evidence:** isEmptyAssistantTurn matches both failed messages; the
     enabled empty-final nudge is capped at three. The loop breaker keys on
     exact tool/arguments, threshold five, and resets after bash/write/edit.
     These traces mostly vary discovery calls or use bash. OpenCode's plugin
     only exposes setup skills; it does not install the Pi guard runtime.
   - **Assessment:** Fact from current code. A replayed predicate match is
     not proof a live nudge would recover these exact attempts. Do not promise
     that Mode prevents .venv scans, or that Pi guards also ship in OpenCode.

10. **Claim: Smaller standing context is reasonable, but its outcome effect
    was not isolated here.**
    - **Evidence:** General project guidance is 422 characters, about 11% of
      the 3,867-character four-tool system message; global notes are 214
      characters. Initial context is 1,840–1,859 tokens with four tools and
      2,438 with seven. The extra schemas cost about 598 initial tokens,
     much smaller than a dependency result. Only two trials reread AGENTS.md.
    - **Assessment:** Fact about prompt sizes. Shorter context removes an
      identified contradiction and future-file cue, but does not by itself
      establish faster or more reliable completion. Do not optimize a small
      instruction reread while ignoring the giant retrieval result.

    - **Settings precision:** Although the UI/session says high thinking,
      captured requests enable/preserve thinking without sending a numeric
      thinking budget or reasoning_effort high. Do not assume changing the
      displayed level changes an oMLX budget; check the emitted payload first.

11. **Claim: The judge supports the code assessment, not configuration ranking.**
    - **Evidence:** The fixed rubric excludes speed/tool efficiency. It sees
      project instructions and tool outcomes, so is not blinded to every
      condition. It labeled missing reporting "inaccurate" in an empty-final
      case, miscounted a blank line elsewhere, and proposed unneeded greeting
      capitalization flexibility. Its pass/fail verdicts agree with code and
      execution; its minor comments need review. Total reported judge cost
      for the ten calls is $0.047232036, separate from Mellum usage.
    - **Assessment:** Fact and interpretation. Distinguish absent reports
      from false claims, and behavior correctness from policy adherence.
      Future judging can receive concise tool/test summaries while retaining
      complete raw traces; vendored filename lists add little to code review.

## Conclusions that need care

The original-prompt condition completed twice, versus once in the neutral
four-tool condition. That is a hypothesis worth preserving, not prompt
selection evidence. Even under a hypothetical independent 50% success
process, two consecutive successes occur 25% of the time. Here trial order
was grouped, not randomized, and cache was uncontrolled. Do not pool the
different original-wording conditions into six "identical" runs either.

Likewise, one search-scope violation disproves a guarantee but does not
disprove a partial benefit. One scan rather than two is inconclusive. The
layout condition completed twice even while scanning twice; absence of a
retrieval improvement does not prove layout cannot affect completion. We
restored the lean candidate for simplicity, not because optional ordinary
guidance was statistically shown to be harmful or useless.

Eight out of ten is a record of these ten attempts, not an estimated general
80% success rate. Failure and success metrics should remain separate:
deliverable completeness, code behavior, test sensitivity, reporting,
environment adherence, retrieval scope and elapsed/context budget.

Minor code issues: optional return annotations/docstrings and top-level blank
lines; search-scope trial 1's module also lacks a final newline. No completed
attempt installed dependencies or weakened tests. The function-returning
interface satisfies the loose rubric, but does not make the module print
when executed as a script. If the video expects visible CLI output, that
expectation must be stated openly rather than added to hidden grading.

## Recommendation

Keep the original sentence for continuity with the first video and the lean
project conventions for ordinary developer use. Present both as disclosed
choices, with incomplete trials retained. Do not claim a winning prompt or
that seven tools are either a fix or a regression. No AGENTS.md no-reread rule.

Prioritize the next investigations by failure mechanism:

1. **Completion:** retain empty-final examples, check deliverables and real
   test outcomes rather than exit status, and capture raw/parsed responses
   for diagnosis. The narrow recorder change is timestamped
   `provider_stream_event` data correlated with provider-request numbers,
   leaving payloads/model/tools unchanged; measure recording overhead.
   Compare the existing Mode guard as a disclosed condition.
2. **Retrieval:** transfer evals should include a legitimate empty repository,
   existing source, .venv and .git metadata. Measure search scope, content
   size and repeated discovery. Test a repository-aware discovery path or
   bounded result policy through the ladder before any shipped change.
3. **Facts/environment:** keep general uv and exact test-command guidance;
   validate scope/configuration restraint on the real AgentClinic phases
   before replacing measured host facts. Bare python succeeding in the
   launcher's PATH is not portable command compliance.
4. **TDD:** evaluate separately if it is the desired project convention.
   Use one short general bullet and neutral task wording, including an
   existing behavior-change task; score expected assertion red then green.
   TDD is not a demonstrated remedy for empty finals or unscoped searches.

A next experiment should be fixed before looking at results, randomize or
interleave conditions, use more than this smoke-test n=2, report all trials,
and include at least one transfer task. The required ladder remains the gate
for changing measured prompts/guards; OpenCode needs its own host path and
checks rather than a claim inherited from Pi.

## What would falsify this

- Raw provider data shows a tool call that Pi dropped, changing the attribution
  of empty finals; or model-native data confirms the generation stopped early.
- Matched transfer trials establish a reliable wording/tool/scope effect.
- A direct behavior or mutation check contradicts the accepted tiny-code result.
- Traces from another Pi version or OpenCode show materially different discovery.

## Risks

- Recorded reasoning explains possible decisions but is not causal proof.
- Ten adaptive, grouped attempts on one task are vulnerable to overfitting.
- Cache-read totals are repeated usage accounting, not unique context or
  measured memory/time; zero local billing is not a compute-efficiency metric.
- Post-hoc mutation validates sensitivity, not development order or broad coverage.
- Local artifacts and installed source are not yet a durable release archive.
