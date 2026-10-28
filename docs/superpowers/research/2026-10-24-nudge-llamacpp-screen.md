# Screen: the empty-final nudge on llama.cpp, easy

Date: 2026-10-24. Preregistered in
[the nudge preregistration](2026-10-24-nudge-llamacpp-preregistration.md)
before the run. This is the record of what happened, including the part
that voids the arm's question.

**Outcome.** The arm is closed. It is void for its question: no nudge
fired in either arm, so the two policies were identical in behaviour, and
medium was not run because the staircase's majority gate was not met.

**What is measured.** Two arms on the easy suite, five sessions each,
llama.cpp on this machine: `worker` (prompt v5, seven tools, nudge capped
at 3, loop breaker on) and `no-nudge` (`MELLUM_GUARDS='{"loopBreaker":true}'`).
Sampling is the learner's profile: `temperature 1`, `top_p 0.95`, `top_k 20`,
`max_tokens 16384`. `llama-server` 0.7.0 (build 11669), Mellum 2.1 `Q4_K_M`,
`-c 50000` (`n_ctx` 50176), `127.0.0.1:8002`, Pi 1.1.0, worker `0.1.8`.

**What is conjecture.** Everything about cause. The screen has ten sessions
and one task.

## Table

| Suite | Arm | Passes | Turns | Failed checks | Tool errors | Context | Wall | Output tokens | Nudges |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| easy | worker | 2/5 | 32.6 | 2.4 | 4.2 | 15351.8 | 79.3 | 8146.4 | 0.0 |
| easy | no-nudge | 3/5 | 34.6 | 1.4 | 4.6 | 10422.6 | 95.5 | 8927.0 | 0.0 |

`uv run python learn/code/evidence.py` over the run directory produced that
table; `Nudges` is the column this arm was built to read.

## The nudge never fired, in either arm

Ten sessions, zero nudge fires. The guard was not idle because the arms
behaved well; it was idle because no empty turn had the shape it answers.
Every empty final in the screen, by `stopReason`:

| run | arm | pass | stop reason | what ended it |
| --- | --- | --- | --- | --- |
| `9376e6` | worker | FAIL | `error` | request of 51,697 tokens against `n_ctx` 50,176 |
| `b9ca14` | worker | FAIL | `length` | output cap spent mid-task |
| `e8c4fa` | worker | FAIL | `error` | context overflow |
| `8a539d` | no-nudge | FAIL | `error` | context overflow |
| `ec8c1b` | no-nudge | PASS | `length` | output cap after the work was done |
| `624e3d` | no-nudge | FAIL | — | no empty final; three failed checks |

`isEmptyAssistantTurn` continues only a turn the model ended itself with
`stop`. `error` is excluded on purpose — an aborted turn is not ours to
continue — and `length` never matched. So on this backend, easy, the empty
finals are a **context overflow** or an **output cap**, not the premature
`stop` the guard was built for.

## Reading

**The arm cannot answer its question.** With zero fires, `worker` and
`no-nudge` are the same policy: the guard is present but never consulted.
The 2/5 against 3/5 difference is therefore not a nudge effect at all; it is
the same policy scoring differently in two samples of one task. An earlier,
unregistered sample of the `worker` arm (`/tmp/mellum-nudge-screen`) passed
3/5 with the same zero fires and one `length` final, which points the same
way: at n = 5 on this suite, one session is noise.

**What the screen did find.** On llama.cpp the easy task drives some runs
into the context window: the failing requests were 51,697 tokens against
50,176. The worker deliberately refuses Pi's auto-compaction while the mode
is on, so a long run has no way down except to fail. That is a worker and
setup behaviour, not a model lapse, and no guard of this shape can answer it.

**Decision rules.** Rule 4 applies and is the only one that does: the empty
finals carry a stop reason other than `stop`, so they are a separate
pathology and are not nudge misses. Rule 1 does not apply as written —
`no-nudge` matches `worker`, but it does record an empty final, so its second
clause fails. Rules 2 and 3 need a fire and there was none. The rule set had
no clause for "no fires in either arm", which is what happened; that is a gap
in the preregistration, recorded here rather than patched afterwards.

**The staircase stops.** `worker` passed 2 of 5, short of the 3-of-5
majority, so medium was not run and hard is out of reach by rule. No
comparative claim is made from this arm.

## What would falsify this

A session whose empty turn carries `stop` and does not continue would mean
the guard had a shape to answer that this screen missed. A run with a bigger
context window that still ends empty would mean the overflow explanation is
wrong. Either changes the reading above; neither is measured here.

## Risks

One task, ten sessions, one machine. The overflow is a property of this
suite on this window, not of Mellum. Nothing here transfers to oMLX, and
nothing here is a rate: 2/5 and 3/5 are counts of sessions.

## What Andre saw, and how this differs

Andre's records and this screen are not the same instrument, so they do not
compare as rates.

- **Instrument.** His mediate rungs 6–12: AgentClinic builds with a hidden
  cumulative oracle and a frozen acceptance test, n = 3 per rung, with a
  re-dispatch loop. His prompts are v7, v9 and v11. This arm runs the easy
  suite, one clinic prompt, n = 5, no mediation, prompt v5.
- **Failure shape.** His dominant failure is completeness: the worker writes
  its own test from the spec's `Tests:` line, passes it and stops, and the
  phase-4 `id` is the recurring miss. Rungs 6–9 capped at 9/12 until the
  mediated loop and v9's "implement the whole spec". Today's failures are
  outside that taxonomy: a context overflow and two output caps. No
  mediation and no prompt rewording would have changed them.
- **Empty turns.** Where Andre recorded empty turns, they were a tooling
  artifact, not a model lapse: PR idea 9 stripped the native tool field on
  Gemma E2B, tool results rendered against tools the template no longer
  knew, and the model returned empty turns — 0/15 against 5/15, reverted.
  The nudge's justification was Mellum on oMLX at v3, a model lapse. Today
  neither appeared.
- **Overflow.** Overflow is a deliberate gate in his later rungs — a file
  larger than the window, to test chunking. Here it is an accident of the
  window and the compaction refusal, so it says nothing about capability.
- **Overlapping remedies.** His effort ramp and re-dispatch answer "gave up
  early", which is the nudge's purpose approached from the other side. That
  makes mediation the alternative worth measuring on the suites, not a
  second guard.

## Next

The context budget has to be settled before the nudge question can be asked
again: either a window the easy task fits inside, or a compaction policy that
does not refuse while the worker is on. That is a new arm with its own
preregistration, and it comes before any medium run.

**Raw evidence.** `run.json` per session, plus `trace.jsonl`, `stdout.txt`
and `diff.patch`, are under `/tmp/nudge-easy` on this machine and go to a
`research-2026-10-24` release after review, never into git.
