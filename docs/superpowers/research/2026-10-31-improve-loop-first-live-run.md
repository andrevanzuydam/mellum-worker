# The improvement loop's first live run — it runs, but carries nothing yet (2026-10-31)

## What is measured / What is conjecture

**Measured.** `learn/code/improve.py` on the local M3 (Metal, cached Q4), suite `easy`, 5
iterations, shipped worker (`--arm worker`, facts on), each rep's lessons distilled into the
carried `## Mellum` section for the next rep. Recorded on the scoreboard as `arm:worker`.

| iter | result | turns | wall | why it failed |
|---|---|---|---|---|
| 1 | FAIL | 25 | 104 s | home miss (`miss=4`) |
| 2 | PASS | 42 | 208 s | — |
| 3 | FAIL | 49 | 165 s | `miss=0`, but wrote `check_jinja.py` and `test_home.py` outside the layout |
| 4 | FAIL | 29 | 119 s | home miss (`miss=4`) |
| 5 | FAIL | 42 | 234 s | `miss=0`, but left the workspace contaminated |

1/5. **The loop ran end-to-end and recorded every rep — the plumbing works live, not just in
`--dry-run`.** But it improved nothing: the distiller printed *"nothing new to carry forward"*
on all five iterations, the carried `## Mellum` never grew past the suite's own base facts, and
the turn-count stayed flat and noisy (25, 42, 49, 29, 42) with no downward trend.

**Why it carried nothing (measured).** `mellum-learn`'s pattern vocabulary — test-thrash,
bent-project, false-success, long-run (>30), servers, drift, announce-stop — did not match the
failures these runs actually made: two home-misses, one **writes-outside-layout** (pathology
#10) and one **contamination** (pathology #4). The only pattern that could have fired, `servers`
("Do not: start servers"), was already in the base `AGENTS.md`, so the additive merge
suppressed it. With no new lesson to add, each rep started from the same facts as the last — the
loop was, in effect, five independent runs.

**Conjecture.** That extending `mellum-learn` to the failures the worker actually hits on easy —
a bullet when a run writes outside `app.py`/`models.py`/`templates/`/`tests/`, and when it edits
or adds a test (contamination) — would give the carry something to teach, and only then could
the loop show whether carrying it forward pulls the turn-count down. Until that lands, the loop
is a correctly-wired mechanism with nothing to say.

## What would falsify this / Risks

- **A richer distiller still does not help.** A carried fact is a reminder, not an enforcement
  (pathology #14: a rule in every request was ignored at n=3). The worker may read "do not write
  outside the layout" and do it anyway, in which case the fix is a **guard**
  (`guard/stay-in-workspace`), not a fact — and the loop should carry *which remedy to add*, not
  advice.
- **Small, noisy n.** Five reps; the two `miss=0` failures (layout, contamination) may be the
  flaky quality trips that `+ quality` already addresses on easy, not a stable signal.
- **Wrong arm for the question.** This ran the bare shipped worker, which is 1/5 on easy anyway;
  the easy *record* is `acceptance · ncm · nonblock` at 6/6, 17 turns. Carrying learnings on top
  of the winning stack (not the plain worker) is the fairer test of whether the loop adds
  anything the stack does not already get.
