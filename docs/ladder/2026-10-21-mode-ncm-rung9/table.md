# Mediation reaches Mode — rung 9

6-bit Mellum in **Mellum Mode** (shipped worker: guards + facts), with the
frozen `test_phase4.py` placed (`--acceptance-test` in Mode) and the NCM verify
gate loaded (`--pi-extension extensions/mellum-ncm.ts`). Rung 9, n=3.

| config (`--mode mode`, 6-bit) | rung 9 | wall |
|---|---|---|
| shipped Mode, **no mediation** ([2026-10-21](../2026-10-21-shipped-mode-rung9/)) | **0/3** | 250–402s |
| **+ frozen test + NCM gate** (this record) | **3/3** | 110 / 145 / 108s |

**0/3 → 3/3.** The NCM gate fired **0 times** here: the 6-bit makes the frozen
test green on the first attempt, so the gate's re-run finds it passing and never
sends it back. The active lever is the **frozen-test placement** (gives v7 its
target); the gate is the **safety net** (proven to fire on the 3-bit, proven not
to regress the 6-bit). For reference, direct + mediated was also 3/3.
