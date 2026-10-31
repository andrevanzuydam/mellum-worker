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

**Why it carried nothing (measured — corrected).** The first reading of this run blamed
`mellum-learn`'s pattern vocabulary; that was wrong. The real cause is upstream: the loop's
records file was **empty** — zero records across all five reps. The shipped worker writes its
mode record only inside a clean mode-off *deactivation* (`mellum-worker.ts` `writeRunRecord`,
called when the worker turns off), and the harness `--arm worker` run exits without that
transition, so no record is ever appended to `MELLUM_MODE_RUNS`. `mellum-learn` therefore had
**no input**, not a vocabulary mismatch. Each rep started from the same base facts as the last;
the loop was, in effect, five independent runs.

So the distiller fed from the mode-record channel cannot work in the harness. The reliable
per-rep artifact the harness always writes is `run.json`, and it carries exactly the verdicts
these runs failed on — `out_of_layout` (iter 3: `check_jinja.py`, `test_home.py`, pathology #10)
and `contaminated` (iter 5, pathology #4). The fix is to distil the carried facts from those
verdicts, not from the empty mode-record file.

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
