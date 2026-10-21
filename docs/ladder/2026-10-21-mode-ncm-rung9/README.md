# 2026-10-21: the mediation reaches the shipped worker — Mode rung 9, 0/3 → 3/3

**What is measured.** 6-bit Mellum in **Mellum Mode** (the shipped worker —
guards + facts + 7 tools), rung 9, n=3, with the mediation now delivered through
*extensions*: the frozen `test_phase4.py` placed in the Mode workspace
(`--acceptance-test`, now allowed in Mode) and the **NCM verify gate**
(`extensions/mellum-ncm.ts`) loaded via `--pi-extension` (the mode runner now
passes extra extensions). Result (`table.md`): **3/3** (110/145/108s), up from
the un-mediated shipped Mode's **0/3**.

**Why this matters.** Earlier the 12/12 win lived only in direct mode; the
shipped worker (Mode) was 0/3 because the mediation (verify/re-dispatch) was
direct-only in the ladder and reached nothing the product runs. This closes that
gap: the mediation is now reachable from Mode.

**Honest attribution.** The NCM gate fired **0 times** — the 6-bit passes the
frozen test first-try, so the active lever is the **frozen-test placement**
(gives v7 its target). The gate is the **safety net** for a self-exit-on-
incomplete (the phase-4 miss); it is proven to fire (on the 3-bit,
`docs/ladder/2026-10-21-halving-3bit`) and proven not to regress the 6-bit here.

Note: [`research/2026-10-21-mediation-reaches-mode.md`](../../superpowers/research/2026-10-21-mediation-reaches-mode.md).
Raw stripped per `AGENTS.md`.
