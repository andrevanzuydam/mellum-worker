# Session progress — 2026-10-18

A progress snapshot for reporting: what is validated (evidence in hand) vs what
is still running, plus a diagnosis of the stock rung-6 failures seen mid-run.

## Validated today (evidence in hand)

1. **Measurement harness built test-first and green** — 202 ladder tests +
   313 node assertions. Capabilities landed tests-first:
   - `--backend` / `--base-url` / `--temperature` / `--top-p` (a7b3420)
   - `--model-id`, fixes the mlx-lm served-id mismatch (cdab135)
   - `--acceptance-test` + `--redispatch`, the M.11 mediated-test screen and the
     verify-and-re-hand loop (5bf4a0d, 6426b2b, ff17d60)

2. **Mellum natively drives Pi's agent loop** — it emits JSON tool_calls, edits
   files, and passes rungs on real `pi -p`. Observed live; the core viability
   fact for the project.

3. **The mediated test (M.11) works end-to-end on real Pi** — mediated rung-9
   PASS (one worker, converged first attempt, hidden oracle green) vs stock
   rung-9 FAIL (deadline). Recorded as an n=1 lead, not preregistered (5cb550f).

4. **Freeze-the-oracle mechanism sound, validated without a full run** — the
   phase 1-3 mediated acceptance tests pass 9/9 against the golden fixture,
   proving the tests encode the spec before run-time is spent.

5. **Pi's small-model limit diagnosed; Pi exonerated** — the 2B distill fails in
   Pi because it answers in markdown code blocks, not JSON tool_calls (confirmed
   by controlled replay with Pi removed). Pi needs tool-call-trained models;
   model size is not the gate. Decision: keep Pi, focus on Mellum.

## In flight — not yet a result

Preregistered stock-vs-mediated rungs 6-9 run (n=3). Arm A (stock) partway:

| rung | r1 | r2 | r3 |
|------|------|---------|------|
| 6 | FAIL | FAIL | pass |
| 7 | pass | pass | pass |
| 8 | FAIL | running | - |
| 9 | - | - | - |

Arm B (mediated) not started. No promote/no-promote verdict yet.

## Finding: why stock rung 6 r1 and r2 failed

Rung 6 is AgentClinic phase 1 (home). The task requires the worker to deliver
both a working app AND the visible tests from the spec. Scoring combines the
visible facts command (`pytest tests -q`), the hidden oracle (`_hidden_p1.py`,
copied in at scoring time), existing-tests-kept, and the write-list.

All three rung-6 runs hit the 600s deadline (`deadline_hit: true` for every run,
including the r3 pass). Rung 6 sits right at the edge of stock Mellum's time
budget, so convergence within 600s is close to a coin-flip.

- **r1 — built a correct app, wrote no tests, ran out of time.** The hidden
  oracle passed (`pytest _hidden_p1.py` → 1 passed: the app logic was right), but
  the visible `pytest tests -q` reported "no tests ran" because the worker left
  `tests/` empty (only `.gitkeep`). It was still in `toolUse` at 600s (53
  requests, 14 tool_errors) — guillotined before it wrote the visible tests the
  spec asks for. Confirmed live in the surviving workspace.

- **r2 — did not converge.** It wrote `tests/test_home.py` but the app was wrong
  (hidden oracle failed) and the visible suite failed too; stalled at 31
  requests / 10 tool_errors, deadline hit.

- **r3 (pass)** — same deadline pressure, but its workspace was in a fully
  passing state (visible + hidden green) at the cut.

**Takeaway:** the rung-6 failures are a throughput/deadline problem, not a
capability gap — Mellum can build the app (r1 proves the logic), but at stock
settings it is a coin-flip whether it finishes the full visible+hidden
acceptance within 600s. Contributing to the time pressure: high tool_errors
(10-23 per run, fumbled tool calls that burn turns) and large prompt growth (up
to ~192k chars, slowing each request). This is direct motivation for the
mediated path (arm B): handing a frozen failing test focuses the worker and
should converge faster and more reliably.

## Built (process, not a measurement)

mellum-dev skill + CI workflow (node + ladder jobs) + CLAUDE.md auto-load + the
🍓 marker (a66f163, ad2f4ec, a026463); EXAMPLE.md (000a88f); SDD research notes,
preregistration, and backlog entries.
