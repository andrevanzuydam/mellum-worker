# Preregistration: project facts on llama.cpp, easy

Date: 2026-10-24, written before the run. Phase LC.13A, task 4, first arm.
Lesson 5's claim comes from oMLX: "a 600-character facts section takes a
four-phase build from 1/12 to 9/12". Nothing on llama.cpp has measured it.

**What is measured.** Whether the facts block changes what the worker passes
on easy, and — first — whether it reaches the model at all. The second
question is not optional: the guard and window arms both closed void because
the thing being measured never happened, and this arm carries its own count.

- Backend: `llama-server` 0.7.0 (build 11669), Mellum 2.1 `Q4_K_M`, `-c`
  50,000 (`n_ctx` 50,176), `127.0.0.1:8002`, `scripts/backend.py start`.
- Sampling: the learner's profile (`temperature 1`, `top_p 0.95`, `top_k 20`,
  `max_tokens 16384`).
- Runner: `uv run python learn/code/harness.py run --suite easy --arm <arm>
  --repeat 3 --grade`.
- Arms, one column between them:
  - `worker`: prompt v5, seven tools, nudge on, loop breaker on, facts on.
  - `no-facts`: the same, with `MELLUM_MODE_FACTS=0`
    (`extensions/mellum-facts.ts` returns `source: "off"`).
- n: 3 sessions per arm, easy (the lesson template's n). Medium only if
  `worker` passes a majority of easy; hard only on a majority of medium, and
  not at all if medium shows no headroom.

**The block being tested.** Every suite ships the same `## Mellum` section in
`AGENTS.md` — six bullets, one of them `Test command: uv run --frozen python
-m pytest tests`, well inside the 600-character cap. The worker appends
`\n\nProject facts:\n- …` to each user message it forwards.

**Reading.** Per arm: passes out of n; the **injection count** — sessions
whose `provider_request` payload contains `Project facts:`, read from the
trace, because a facts arm with no injection is void rather than thin; the
block's character count; requests, tool errors, peak input tokens and wall.
Peak demand travels with the passes: the window arm showed easy varies from
857 to 4,699 tokens, so a pass count alone invites a wrong explanation.

**Decision rules, fixed now.**

1. No `worker` session's payload contains `Project facts:`: the block never
   reaches the model in this headless path. The arm is **void**, recorded as
   such, and no page speaks about facts on llama.cpp.
2. The block appears in every `worker` session and in no `no-facts` session,
   and `no-facts` matches or beats `worker` on passes: facts are **not
   load-bearing** on easy. A null, recorded as a null; the lesson keeps a
   `screen` badge and says the delivered block did not move this suite.
3. The block appears in every `worker` session and `worker` beats `no-facts`
   by two or more sessions: a **lead**, recorded with the injection count
   beside the passes, and the page may cite it at n=3 while naming n.
4. Facts appear in a `no-facts` session: the knob did not take effect. Those
   sessions are invalid, the env is recorded, and the arm is void — the
   harness now clears `MELLUM_MODE_FACTS` from the inherited environment for
   exactly this reason.
5. Any other split is **null**: recorded with both counts, and the page states
   no direction.

**What is conjecture.** That three sessions of one task can separate a
600-character block. It cannot, at the level of individual passes; the arm's
job is to decide whether the page may speak about the delivered block on
llama.cpp at all, and in which words. The mechanism — the model obeying the
test command instead of inventing one — is a hypothesis this arm does not
test.

**What would falsify this.** An injection count that disagrees with the trace
on re-reading. A session whose workspace lacks `AGENTS.md`. A `no-facts`
session whose payload contains the block. Two arms whose payloads are
identical despite the flag, which would mean the arm measured one policy.
Any served window other than 50,176, or a run under a different Pi version
than the one recorded here.

**Risks.** Three worker sessions at the same window already exist from the
window arm (`A-50k`: 3/3, peaks 857–4,699). They are cited beside this arm as
corroboration and are **not pooled** with it: they were run before the facts
knob was an arm, and pooling pre- and post-registration sessions is how a
null becomes a rate. Easy's demand varies, so a pass count without its peak
would invite the wrong cause. One machine, one quant, one task.

**Raw evidence.** `trace.jsonl`, `stdout.txt` and `diff.patch` per run go to a
`research-2026-10-24` release after review, never into git.
