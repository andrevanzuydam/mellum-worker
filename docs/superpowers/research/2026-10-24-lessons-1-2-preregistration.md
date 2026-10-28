# Preregistration: lessons 1 and 2 on llama.cpp, easy then medium

Date: 2026-10-24, written before the run. LC.13A, task 4. Lessons 1 and 2 are
the two pages that can be re-based without a new instrument or a suite change:
both pairings already exist as arms.

**What is measured.** Two pairings, one change each, against a shared control.

| Pairing | Lesson | Control | Arm | The one change |
| --- | --- | --- | --- | --- |
| P1 | 1, "The primary agent is the wrong worker" | `worker` | `bare` | no extension at all — Pi base with its seven tools |
| P2 | 2, "A short prompt, not a procedure" | `worker` | `no-prompt` | `MELLUM_WORKER_PROMPT=pi` |

`bare` **is** the primary agent: no extension, the same model and tools, so the
pairing is the lesson's own comparison rather than an analogy. Both arms run
against a single `worker` sample, which serves as the control for each; the two
pairings are never compared with each other, and no claim may be drawn between
`bare` and `no-prompt`.

- Backend: `llama-server` 0.7.0 (build 11669), Mellum 2.1 `Q4_K_M`, `-c 50000`
  (`n_ctx` 50,176), `127.0.0.1:8002`, `scripts/backend.py start`.
- Sampling: the learner's profile — `temperature 1`, `top_p 0.95`, `top_k 20`,
  `max_tokens 16384`. Not the ladder's greedy block.
- Runner: `uv run python learn/code/harness.py run --suite <suite> --arm <arm>
  --repeat 3 --grade`.
- n: 3 sessions per arm per suite, the lesson template's n.

**Staircase.** Easy first, all three arms. Medium only if `worker` takes a
majority of easy (2 of 3), and then for all three arms. Hard is not run: the
45-session record has it at 0/9 for every arm, so it cannot separate policies.

**Reading.** Per arm and suite: passes out of n; peak input tokens, because
easy's demand ranges 857 to 51,697 across records and a pass count without its
peak invites the wrong cause; requests, tool errors, wall, empty finals by
`stopReason`, nudge fires, and whether the facts block was injected (a payload
without `Project facts:` means the worker arm was not the worker). For P1 the
`bare` arm is additionally read for *what it spent*: with no extension it has
neither the facts block nor the guards, so its failures are expected to be
process failures rather than pass-rate ones.

**Decision rules, fixed now.**

P1, lesson 1:

1. `bare` passes no session and `worker` passes 2 or more: the bounded worker
   passes where the primary agent does not, on this suite at n=3. The page may
   state that, naming the suite and n.
2. `bare` passes any session: the primary agent is **not** ruled out on easy.
   The page states the null and retires the oMLX-derived 8/15.
3. `worker` passes fewer than 2: no direction; the page carries `screen` and
   says the arm did not settle it.

P2, lesson 2:

4. `worker` and `no-prompt` pass within one session of each other: **null**,
   as the 45-session record found at n=3. The page says the prompt did not move
   passes here, and may still report the context difference if one appears.
5. `worker` is ahead by two or more sessions: a **lead** for the prompt,
   recorded with the counts and cited at n=3 with n named.
6. `no-prompt` is ahead: the prompt is not load-bearing on this suite; stated
   as a null for the prompt, not as evidence against the worker.

**What is conjecture.** That three repeats of a single easy task measure a
policy. Easy is one prompt, so each arm is one task three times; the pairing
can show a floor (as `bare` 0/9 did) or a tie, and little in between. The
mechanism each page will describe — the primary agent looping or over-reading,
the prompt suppressing a tool fact — is not tested by the pass count.

**What would falsify this.** A `worker` session whose payload lacks
`Project facts:` (the wrong arm ran). A `bare` session with the extension
loaded. Two arms whose payloads are identical despite the flag. Any session
whose served `n_ctx` is not 50,176, whose workspace was contaminated, or that
hits the 600 s deadline — deadline kills are reported as `DEADLINE`, never
pooled as failures, because the wall column cannot distinguish a stall from
slow work ([record](2026-10-24-context-budget-screen.md)).

**Risks.** Today's easy walls have drifted from 190 s to 592 s between arms,
so a deadline kill is plausible and would thin an arm to two sessions. Three
sessions of one task cannot establish a rate; the pages must say n=3 and name
the suite beside every number. One machine, one quant.

**Raw evidence.** `trace.jsonl`, `stdout.txt` and `diff.patch` per run go to a
`research-2026-10-24` release after review, never into git.
