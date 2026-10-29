# Handover — prove each lesson (before/after FAIL → PASS)

Working note for continuing the lesson-proof effort on a local machine.
Transient; delete when the effort lands. Date: 2026-10-29.

## Where things stand

- Lessons aligned to the 2026-10-29 local 6-bit runs — commit `358451a`.
- Internal `LC.26` codes stripped from 23 lesson pages ("planned under LC.26"
  → "planned") — this push. ROADMAP still owns LC.26 internally.
- The "prove each lesson" effort is **started and the method is validated** on
  one lesson (below). Nothing else of it is built yet.

## The goal

Give each lesson a before/after on its own challenge: **without the remedy →
FAIL, with the one remedy → PASS.** That turns every "Lesson check: not built
yet" into a real result and lifts the Solution/Validation badge from
`conjecture`/`screen` toward `measured`.

## Why it was stuck, and the fix

- E6's running-commands check on **BF16** got before 3/3, after 3/3 — **no
  separation**. The strong model dodged the pathology (checked in-process or
  backgrounded the server itself), so the bare arm passed and the guard's
  effect couldn't register.
- The **6-bit model is weaker and falls into the traps** (our build-a-harness
  smoke caught it stalling on `uvicorn`). So run the checks on the 6-bit: it
  fails the bare arm where BF16 slipped through.

## First result — proof of method (running-commands, 6-bit)

| Arm | Remedies | Passed |
| --- | --- | --- |
| before | `guard/break-repeat-loops,guard/stay-in-workspace,guard/refuse-whole-file-rewrite` | **2/3** |
| after | before + `guard/block-foreground-server` | **3/3** |

n = 3, `--deadline 600 --stall 120`, no `--grade`. The 6-bit separated where
BF16 did not.

**Honest caveats** (read before claiming a win):
- A 1-session gap at n = 3 is a lead, not a rate.
- The one before-FAIL (9 requests, 3 tool errors, finished fast) was **not
  clearly a foreground-server stall** — inspect its trace, or raise n, before
  claiming this guard fixed *that* pathology. It could be noise.
- Raw runs were written to a session-local scratch dir and are **not** in git.
  Re-run with the commands below to reproduce.

## Run a lesson check locally

1. **Serve the 6-bit** (oMLX; see `memory` / `docs/backends/omlx.md`):
   ```bash
   HF_HUB_OFFLINE=1 omlx serve --model-dir "$PWD/.models" \
     --host 127.0.0.1 --port 8001 --headless \
     --max-concurrent-requests 16 --memory-guard-gb 24
   ```
   Per-model settings (56k context, thinking on) persist in
   `~/.omlx/model_settings.json`; admin-auth is disabled in `~/.omlx/settings.json`.

2. **Build the oMLX 6-bit Pi profile** (the profile dir is not committed):
   ```bash
   cp -R learn/code/profile /tmp/omlx-6bit-profile
   python3 - <<'PY'
   import json; p="/tmp/omlx-6bit-profile/models.json"; d=json.load(open(p))
   k=next(iter(d["providers"])); b=d["providers"].pop(k)
   b["baseUrl"]="http://127.0.0.1:8001/v1"
   b["models"][0]["id"]="Mellum2.1-12B-A2.5B-Thinking-6bit"
   d["providers"]["omlx"]=b; json.dump(d,open(p,"w"),indent=2)
   PY
   ```

3. **Run before, then after** (running-commands shown; swap the suite and the
   two remedy sets per lesson):
   ```bash
   P=/tmp/omlx-6bit-profile; PI=$(which pi)
   C="run --suite running-commands --suites-dir learn/challenges \
      --repeat 3 --deadline 600 --stall 120 --profile $P --pi-binary $PI"
   uv run learn/code/harness.py $C \
     --remedy guard/break-repeat-loops,guard/stay-in-workspace,guard/refuse-whole-file-rewrite \
     --runs-dir /tmp/rc-before
   uv run learn/code/harness.py $C \
     --remedy guard/break-repeat-loops,guard/stay-in-workspace,guard/refuse-whole-file-rewrite,guard/block-foreground-server \
     --runs-dir /tmp/rc-after
   ```
   Each arm prints `running-commands: X/3 sessions passed`.

## The rollout (per lesson)

For each lesson with a remedy (its unit's `meta.lesson`):

1. **Ensure a challenge** under `learn/challenges/<name>/` (`base`, `prompts`,
   `grader`, `expected.json`, `layout.json`). `running-commands` is the
   template. Where none exists, build a **forcing** challenge: the task must
   make the pathology both likely AND fatal (a task the model can finish while
   dodging the trap won't separate — that is exactly the BF16 failure).
2. **before** = the guards/preset up to that lesson; **after** = + the one
   remedy. The two sets are in each lesson's "Run it yourself" block.
3. Run on the 6-bit, n = 3 (raise n if the gap is a single session).
4. If it **separates** (before < after): record to
   `docs/ladder/<date>-<lesson>-check/` (strip `trace.jsonl`/`stdout.txt`/
   `diff.patch`; keep `run.json`), then update the lesson's "Lesson check:"
   line and badge, and add the research note.
5. If it **does not separate** (the 6-bit dodges the pathology too): say so
   honestly — the lesson stays suite-evidence, recorded as one whose pathology
   resists a model-driven FAIL → PASS. Not every lesson will yield a clean
   before/after, and forcing a claim would break the repo's discipline.

## Discipline (do not skip)

- Screens first: a separation is a lead; a preregistered run (fixed arms, n,
  scoring, rule) decides. See `docs/sdd.md` and the `mellum-dev` skill.
- Never commit raw `trace.jsonl`/`stdout.txt`/`diff.patch`.
- Keep changes agnostic — no suite-specific route/table/value coded in.
- Keep the framework name out of commits and docs.

## Infra reference

- Harness: `learn/code/harness.py` (`--suite --suites-dir --remedy --repeat
  --deadline --stall --profile --pi-binary`).
- Remedies: `remedies/<kind>/<name>.ts` — 14 units; `meta.lesson` maps unit →
  lesson; `meta.pathology`/`meta.does`/`meta.evidence` feed the remedies table.
- Built checks to copy: `docs/ladder/2026-10-29-running-commands-check/` (E6,
  BF16) and `docs/ladder/2026-10-29-e5-check/`.
- The 6-bit records this effort builds on:
  `docs/ladder/2026-10-29-local-mellum-baseline/` (21/36 vs BF16 26/36) and
  `docs/ladder/2026-10-29-local-lessons-smoke/` (32/36).
