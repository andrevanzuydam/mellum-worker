# Basic Remedies: the 45-session screen

Date: 2026-10-21. Status: screen, not a rate. Phase LC.11A. The Basic
Remedies module was dropped after this screen; it remains the record for why.

## What ran

Mellum `Mellum2.1-12B-A2.5B-Thinking` on llama.cpp, 50k context. Five
arms, three suites, three sessions per arm and suite: 45 valid sessions.
The full worker is the control for the three ablations.

| Arm | Prompt | Tools | Nudge | Loop breaker |
| --- | --- | --- | --- | --- |
| bare | Pi base | Pi's seven | off | off |
| worker | worker v5 | Pi's seven | on | on |
| no-prompt | Pi base | Pi's seven | on | on |
| no-nudge | worker v5 | Pi's seven | off | on |
| no-loop | worker v5 | Pi's seven | on | off |

The backend exited during the third hard worker session. That session and
all nine no-* sessions that followed while it was down were removed and
rerun; the table contains only sessions with model usage. The run JSON lives
under `/tmp/mellum-basic-remedies-runs`; the raw traces are not committed.

## Table

| Suite | Arm | Passes | Turns | Failed checks | Tool errors | Context | Wall | Output tokens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| easy | bare | 0/3 | 15.0 | 4.0 | 3.0 | 2355.7 | 22.1 | 2931.7 |
| easy | worker | 1/3 | 26.7 | 2.0 | 4.0 | 7834.0 | 78.6 | 8978.3 |
| easy | no-prompt | 1/3 | 22.0 | 2.0 | 3.3 | 15166.7 | 74.3 | 6125.3 |
| easy | no-nudge | 3/3 | 35.3 | 0.0 | 5.0 | 2586.3 | 96.3 | 10981.7 |
| easy | no-loop | 2/3 | 37.0 | 0.7 | 5.0 | 6459.0 | 112.8 | 11663.0 |
| medium | bare | 0/3 | 54.3 | 18.0 | 5.7 | 15128.0 | 359.2 | 33197.0 |
| medium | worker | 2/3 | 47.7 | 6.0 | 5.7 | 7421.7 | 204.1 | 22507.7 |
| medium | no-prompt | 2/3 | 71.0 | 3.0 | 8.7 | 11099.3 | 382.8 | 39164.3 |
| medium | no-nudge | 2/3 | 82.7 | 6.0 | 18.3 | 20286.3 | 375.9 | 37408.7 |
| medium | no-loop | 1/3 | 82.3 | 3.7 | 19.0 | 18059.0 | 383.4 | 40480.0 |
| hard | bare | 0/3 | 84.7 | 29.7 | 12.0 | 25828.0 | 569.1 | 46542.3 |
| hard | worker | 0/3 | 108.3 | 20.7 | 17.0 | 17157.7 | 540.8 | 49524.0 |
| hard | no-prompt | 0/3 | 87.3 | 17.3 | 10.3 | 14318.7 | 474.4 | 46488.0 |
| hard | no-nudge | 0/3 | 101.7 | 17.0 | 18.0 | 14690.7 | 483.7 | 47882.7 |
| hard | no-loop | 0/3 | 93.7 | 14.3 | 7.7 | 16870.3 | 565.6 | 57560.7 |

## Why these walls look slow

The table's wall is per **suite**, not per task. Easy has one prompt, medium
four, hard eleven. The worker's per-prompt wall is:

| Suite | Prompts | Worker wall, mean | Per prompt |
| --- | --- | --- | --- |
| easy | 1 | 78.6 s | 78.6 s |
| medium | 4 | 204.1 s | 51.0 s |
| hard | 11 | 540.8 s | 49.2 s |

Medium and hard are about 50 s per prompt, close to the old worker's 54 s
mean per rung. The 204 s and 541 s totals are the four and eleven prompts,
not a slower turn. Per request, the worker takes 2.9–5.0 s here; the llama.cpp
reference rung 5 took 5.1 s per request.

The easy run is slower per task (79 s) because it used 26.7 requests and
8,978 output tokens, against the old worker's 14.3 requests. The hard run is
108.3 requests over eleven prompts (9.8 per prompt), again near the old
per-task request count.

Generation across the table is 82–133 output tokens per wall second (the worker alone is 92–114); the
llama.cpp backend note records 207.6 tok/s for a short smoke. That is not a
like-for-like comparison: these runs include long thinking, tool calls,
prompt evaluation and a much larger state. The old oMLX numbers are also not
in this table, so no backend-to-backend rate is claimed here.

## What it says

- **Passes.** Bare is 0/9. The worker is 3/9, no-prompt 3/9, no-nudge 5/9
  and no-loop 3/9. Hard is 0/9 for every arm: the suite has no headroom, so
  it cannot distinguish the remedies.
- **Prompt.** Removing the worker prompt changes nothing measurable: the
  worker and no-prompt are both 3/9, with the same easy and medium counts.
  The prompt reduces context (easy 7,834 vs 15,167 tokens) but not failures.
  This does not support the prompt as a basic remedy on these suites.
- **Nudge.** Removing the nudge is the best result on easy (3/3 against
  1/3), and the same on medium (2/3), for 5/9 against 3/9. With n = 3 this
  is a lead, not a rate; it may mean the nudge extends a run that had already
  stopped. It does not rescue hard.
- **Loop breaker.** Removing it leaves total passes unchanged (3/9), and
  hard still has no pass. It lowers hard failed checks and tool errors, but
  not enough to pass; no remedy is demonstrated.
- **The bundle.** Bare to worker moves 0/9 to 3/9, all on easy and medium.
  Hard is a floor for both. That is weaker than the old rung-1–5 claim and
  says nothing about the parts.

## Decision needed

The screen does not justify writing the three Basic Remedies lessons as
positive claims. Options:

1. **Call it a negative result.** Write one lesson from the screen: the
   worker prompt did not matter here, the nudge is a lead, and hard needs a
   discriminating task. Do not ship the three positivity lessons.
2. **Raise n on easy/medium** for worker vs no-nudge (the only separation)
   before writing the nudge lesson; the prompt and loop lessons remain null.
3. **Recalibrate the suites.** Easy already floors bare and hard floors
   everyone; the suites need tasks where the worker and its parts separate.

No measured lesson text until one of these is chosen.
