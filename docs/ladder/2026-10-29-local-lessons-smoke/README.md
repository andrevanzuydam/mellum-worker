# Local 6-bit lessons smoke, 2026-10-29

Every lesson's "Run it yourself" harness command run once against the local
6-bit Mellum, to check the local path drives each lesson and grades. Vanilla
Pi 1.3.0 driving Mellum 2.1 6-bit on oMLX 0.7.1rc1 at `127.0.0.1:8001`, Apple
M3 Max, through the shipped `learn/code/harness.py`. Reading:
`docs/superpowers/research/2026-10-29-local-mellum-baseline.md` (the ladder
baseline this sits beside) and the per-lesson note below.

**This is an n = 1 smoke, not a graded rate.** Each command ran once, with the
deadline capped at 900 s — the `baseline.py lessons` default, which asks "does
each lesson's harness run and grade here", not "how often does it pass". The
orchestration (which command a lesson ships, the smoke argv) is reused from
`scripts/baseline/baseline.py`; the model-calling config matches the 6-bit
ladder baseline (oMLX, 56k context, thinking on).

- `summary.md`: every command and its one-line result.
- one dir per lesson, each holding its sessions' `run.json` and `final.md`.
  Raw traces, stdout and diffs are not in git.

## Result — 32/36 graded PASS

43 command rows: 4 lessons ship no harness block (E1 the-ditch, H2 the-handoff,
H4 frozen-gates-and-checkpoints, H6 best-of-n), 2 are fill-in-the-blank
template commands (`path/to/your-remedy.ts`, `path/to/your-tool.ts` — exit 1 by
design), and 1 is a `--dry-run`. That leaves **36 real graded runs, 32 PASS**.

| Tier | Graded | Pass | Fail |
|------|-------:|-----:|------|
| Easy | 11 | 11 | — |
| Hard | 6 | 6 | — |
| Medium | 19 | 15 | M1 build-a-harness ×3; M9 one-spec-per-phase (joined) ×1 |

The four failures cluster where the model must **build and drive its own test
rig** (M1 build-a-harness: both easy variants fail on tool errors, the medium
hits the 604 s deadline with 39 tool errors) or digest **one joined spec**
instead of per-phase splits (M9: `--specs joined` fails, `--specs split`
passes). Both are the write-tool-friction and dense-input wall already recorded
in the phase-5 and cross-model notes — no new failure shape.
