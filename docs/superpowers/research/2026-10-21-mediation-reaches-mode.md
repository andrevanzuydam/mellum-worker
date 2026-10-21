# The mediation reaches the shipped worker: Mode rung 9, 0/3 → 3/3

Date: 2026-10-21.

## What is measured

6-bit Mellum in **Mellum Mode** (the shipped worker — guards + facts + 7 tools)
on rung 9, n=3, with the mediation delivered through extensions:
- the frozen `test_phase4.py` placed in the Mode workspace (`--acceptance-test`,
  now allowed outside direct mode), and
- the **NCM verify gate** (`extensions/mellum-ncm.ts`) loaded via
  `--pi-extension` (the mode runner now forwards extra extensions).

| config (`--mode mode`, 6-bit) | rung 9 |
|---|---|
| shipped Mode, no mediation ([record](../../ladder/2026-10-21-shipped-mode-rung9/)) | **0/3** |
| + frozen test + NCM gate ([record](../../ladder/2026-10-21-mode-ncm-rung9/)) | **3/3** (110/145/108s) |

## The finding

**The mediation now reaches the shipped worker, and it closes the rung-9 gap:
0/3 → 3/3.** Earlier the 12/12 lived only in direct mode; Mode was 0/3 because
the verify/re-dispatch was direct-only in the ladder. Two plumbing changes made
it reachable: `--acceptance-test` works in Mode (places the frozen test), and
the mode runner forwards `--pi-extension` (loads the NCM gate).

## Honest attribution

The **NCM gate fired 0 times** in this run. The 6-bit makes the frozen test
green on its first attempt, so the gate's re-run finds it passing and never
sends the worker back. Therefore:
- The **active lever is the frozen-test placement** — it gives v7 the single
  named target it is built for, and a capable worker just does it.
- The **NCM gate is the safety net** for a self-exit-on-incomplete (the original
  phase-4 `id` miss). It is proven to *fire* (on the 3-bit,
  [halving-3bit](2026-10-21-halving-3bit.md), 21 injections) and proven *not to
  regress* the 6-bit here. Its active value needs a case where the first attempt
  self-exits red — not triggered by the capable 6-bit on this rung.

## Decision

The shipped worker can now be run mediated in Mode. Ship the two enabling
changes (acceptance-test in Mode, mode loads `--pi-extension`) and the NCM gate
as the route for the mediation to reach the product. The win is the method
reaching Mode (0/3 → 3/3), not the gate's active contribution on rung 9.

## What would falsify this / Risks

- **Falsify the gate's value:** a run where the worker self-exits with the
  frozen test red and the gate recovers it to a pass would show the gate
  *actively* earning its place; absent that, the gate is non-regressing
  insurance, not a measured lift on rung 9.
- **Risks:** n=3, one machine; the frozen test is the single-variable lever
  (the gate is dormant here), so "NCM" is confirmed as plumbing + safety net,
  not as a rung-9 pass-rate driver for a capable model.
