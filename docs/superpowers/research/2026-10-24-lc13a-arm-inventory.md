# Arm inventory: Paul's ten lessons on the suites harness

Date: 2026-10-24. Status: reading, not a run. Phase LC.13A, task 2 of
[the plan](../plans/2026-10-24-lc13a-lessons-rebase.md). No numbers here are
new; every one is quoted from a record and named.

## What the instrument can express

`learn/code/harness.py` fixes five arms in `ARMS` and maps each to an
environment in `arm_settings`:

| Arm | What changes |
| --- | --- |
| `bare` | no extension: Pi base, seven tools — the primary agent |
| `worker` | the extension, prompt v5, nudge on, loop breaker on |
| `no-prompt` | `MELLUM_WORKER_PROMPT=pi` |
| `no-nudge` | `MELLUM_GUARDS={"loopBreaker":true}` |
| `no-loop` | `MELLUM_GUARDS={"emptyFinalNudge":3}` |

Three suites — easy (1 prompt), medium (4), hard (11) — are graded by hidden
pytest, `ruff --select F,E9`, `pyrefly` and `complexipy`. `--repeat N` gives
n sessions; `learn/code/evidence.py` reports passes, turns, failed checks,
tool errors, context, wall, output tokens and **nudges**.

The extension exposes three further knobs the harness does not use:
`MELLUM_MODE_FACTS=0` (in `extensions/mellum-facts.ts`), and nothing for
thinking. Cost per session, from the 45-session record's wall column: easy
79 s, medium 204 s, hard 541 s.

## What n

**n = 3.** [`learn/lesson-template.md`](../../../../learn/lesson-template.md)
sets it: "Use n = 3 for the baseline and for a claim you will state; a screen
may use n = 1." `docs/sdd.md` fixes no number of its own — a preregistration
fixes n per run — and the two llama.cpp records are n=3 per arm and suite
(the 45-session screen) and n=5 (the void nudge arm). The costs below are
n=3, three sessions per arm and suite.

One conflict is recorded rather than resolved here: this phase's plan asks
for **n = 10** (`2026-10-24-lc13a-lessons-rebase.md`, tasks 4 and the
constraint "never quote a rate from n < 10"), written after the nudge screen
found one session of n=5 to be noise. The template governs what a lesson
states; the plan governs this phase's runs. Until they agree, a page written
at n=3 is inside the template and short of the plan, so this note costs
n=3 and flags where n=10 would multiply the bill.

## The inventory

Verdict is one of: **re-citable** (a llama.cpp number already exists at the
n a page needs), **expressible** (the five arms cover it; only sessions are
owed), **new arm** (one `arm_settings` entry), **new instrument** (graders,
machinery or a suite change), **no arm** (the mechanism is gone).

| # | Lesson | Arm | Verdict | Cost |
| --- | --- | --- | --- | --- |
| 1 | The primary agent is the wrong worker | `bare` vs `worker` | expressible | 2 arms × easy+medium, n=3: ~28 m |
| 2 | A short prompt, not a procedure | `worker` vs `no-prompt` | expressible | 2 arms × easy+medium, n=3: ~28 m |
| 3 | Thinking is working memory | strip thinking (A12) | new instrument | machinery, then 2 arms × n=3: ~28 m |
| 4 | Guards for empty turns and loops | `worker` vs `no-nudge`, `no-loop` | expressible, void | 3 arms × easy, n=3: ~12 m, after task 3 |
| 5 | Project facts | facts off | new arm | `MELLUM_MODE_FACTS=0` entry + tests, then n=3: ~28 m |
| 6 | Write only the files you list | no arm; a grader | new instrument | file-set check per suite, qualified both ways |
| 7 | Who holds the loop | delegated child | no arm | LC.8 retired the mechanism |
| 8 | A prose brief stops at its first reply | 1 prompt vs N prompts | expressible | one-prompt variant, 2 arms × easy, n=3: ~8 m |
| 9 | The intercom block is a prefill tax | intercom on/off | no arm | LC.8 removed the block |
| 10 | One spec file per phase | multi-phase suite | new instrument | hard 2 arms × n=3: ~54 m, and it floors both |

### Notes

**1. Primary agent.** `bare` *is* the primary agent: no extension, Pi's seven
tools. The record has bare 0/9 against worker 3/9 at n=3, which the template
already allows a page to state. The lesson's 8/15 and 10/15 are oMLX ladder
arms and do not transfer; what the llama.cpp pair lacks is not sessions but
a preregistered reading — the 45-session run is a screen, and
`docs/sdd.md` says screens do not establish comparative rates.

**2. Short prompt.** Both arms exist and the 45-session record ran them:
worker 3/9, no-prompt 3/9 — a null at n=3, which the record itself calls a
null. The natural reading is that the lesson survives as "the prompt buys
context (7,834 vs 15,167 tokens on easy), not passes"; confirming that null
ostensibly settles the claim, but the nudge screen's 2/5 against 3/5 in one
sample of one task is the caution that three sessions on easy is thin.

**3. Thinking.** A12 was a request-layer strip (`ladder/strip-thinking.js`)
in the oMLX ladder. The suites harness spawns `pi` directly, so there is no
place to strip thinking unless llama.cpp's chat template takes an argument
for it. This is the only lesson that needs new machinery rather than a
setting, and its cost is an implementation, not sessions.

**4. Guards.** The arms exist and the screen ran them: worker 2/5,
no-nudge 3/5, **zero nudge fires in ten sessions**. The arm is void for its
question, not for lack of an arm. What it needs first is task 3, the context
budget — every empty final on easy was `error` (context overflow) or
`length` (output cap), and `isEmptyAssistantTurn` continues only `stop`.

**5. Project facts.** `extensions/mellum-facts.ts` already honours
`MELLUM_MODE_FACTS=0`, so this is one line in `ARMS` and one in
`arm_settings`, plus the test that pins the two arms apart. Cheapest of the
ten in code, and the knob is read in one place, so the arm cannot silently
end up identical to `worker`.

**6. Write only the files you list.** No arm can express this. The graders
score behaviour and lint; nothing compares the written file set to a declared
layout, which is why the record says runs "pass the hidden tests and still
fail by writing outside the layout". That is a grader, and it has to be
qualified with a known-bad fixture or it proves nothing.

**7. Who holds the loop.** The lesson compares worker, mode and a delegated
child. LC.8 retired the Worker subagent, its template, the intercom phases
and the ladder's `delegated` mode, so two of three legs no longer exist.
Re-basing this needs a spec decision about reintroducing a retired mechanism,
not an arm.

**8. A prose brief.** LC.6 gave the harness sessions, so a one-prompt variant
of medium is the same harness with a single `prompts/01.md` holding all four
phase briefs. Expressible without an arm change; the hand-written brief is
the expensive part.

**9. The intercom block.** This is **the lesson with no arm at all**. LC.8
deleted the intercom block from the worker, so the tax cannot be measured
again on any backend; the page can only cite Andre-era records or leave the
track. Recommend the latter at close.

**10. One spec file per phase.** The hard suite has the right shape — seven
phases, eleven prompts, migrations including the phase-4 id — but it is 0/9
for every arm, so it has no headroom to separate anything. The discriminating
instrument was rungs 6–9, which have never run on llama.cpp. Either a suite
with headroom or rungs 6–9; both are new instruments.

## What this means for the staircase

The 45-session record is n=3 per arm and suite, so under the template it is
the size a stated claim may use — but it is a screen, not a preregistered
run, and `docs/sdd.md` keeps those distinguishable. So the honest state of
`learn/lessons/` is: **lessons 1 and 2 have their sessions and need a
preregistration, not more n; lesson 4's arm is void at any n**; the rest
need an instrument before they need sessions. The four `cited` badges
(LC.10–LC.13) all rest on oMLX ladder records, so they are what this phase
must demote or defend regardless of the n question.

Three lessons cost sessions only (1, 2, 8, about 42 m of model time
together at n=3), one costs a line of code (5), one costs a grader (6), one
costs a suite or rungs (10), one costs machinery (3), and two are gone
(7, 9). Task 3 still comes first: the context budget is what voided the
guard arm, and lessons 1, 2, 4 and 8 all run on the suite that overflowed.

## Order the evidence supports

1. **Task 3** — context budget, then a re-baseline of easy at n=3 (n=10 if
   the plan's line stands). It is the precondition for 1, 2, 4 and 8.
2. **Lesson 5** — the facts arm, cheapest and mechanical, and it tests the
   new-arm path end to end before the expensive ones.
3. **Lessons 1 and 2** — one pair of arms (`bare`/`worker`/`no-prompt`)
   covers both pages on easy+medium.
4. **Lesson 8** — the one-prompt suite variant, on whichever of easy or
   medium showed headroom.
5. **Lesson 6** — the file-set grader, which needs no model time to author
   and qualifies on fixtures.
6. **Lesson 4** — ask the guard question again once the window is settled
   and empty finals are `stop`-shaped.
7. **Lessons 3, 7, 9, 10** — each needs a decision before an arm: machinery,
   a retired mechanism, a dropped lesson, or rungs 6–9.

## Risks

The cost column is extrapolated from the 45-session record's per-suite wall
and assumes the same suite and machine; a bigger window (task 3) may cost
more per session, not less. The verdicts for 6 and 8 assume new suite files
can sit beside the existing three without re-qualifying them; that is a
reading of `load_suite`, not a run. The n=3 column is the template's rule;
if the plan's n=10 stands instead, multiply every sessions-only row by
three and expect about 2 h of model time for lessons 1, 2 and 8 alone.
