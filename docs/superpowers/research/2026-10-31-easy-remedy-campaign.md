# Figuring out the easy remedy — a run-by-run campaign, 2026-10-31

## What is measured / What is conjecture

**Measured.** Local M3 (Metal, cached Q4, `llama-server`, the 2026-10-30 baseline
rig), suite `easy` (Bronze: one prompt, four Phase-1 home checks), n=3 serial,
deadline 1800 s, stall 120 s, thinking on, the default prompt and tool set. Each
arm is bare plus the named remedies; the raw runs are kept under `runs/`
(git-ignored) and named in each row.

| # | arm | pass | the shape of the fails |
|---|---|---|---|
| 0 | bare (baseline) | 1/3 | one home-miss (early self-exit), one quality trip |
| 1 | acceptance + ncm | **0/3** | 2/3 stalled on a foreground `python main.py` before settle; the gate never fired ([deadlock note](2026-10-31-cap-ncm-deadlock.md)) |
| 2 | nonblock + acceptance + ncm | **1/3** | **stall gone — all 3 settled**; 2 fails at `miss=1`, each a different home check |
| 3 | nonblock + **fixed** acceptance + ncm | **3/3** | phase-scoped contract + spec-named nav-link assertions; all settled, `miss=0`, contract green on all three |

Arm 3 is the win: it adds the two contract fixes arm 2's fails pointed at —
scope the contract to the phase the prompt names, and assert the spec-named nav
links as real anchors (commit `41c9fbd`, mutation-proven test-first). With the
gate no longer demanding phases 2–4 and no longer accepting a folded-in Home
link, all three reps settled with the hidden grader at `miss=0` (turns 99 / 20 /
19). Easy went 1/3 → **3/3** on this screen. A confirmation run (another n=3, for
n=6) is next, since a single 3/3 at n=3 is a strong lead, not yet a rate.

**The remedy for easy, stated:** `tool/background-long-commands` (survive the
server the worker launches to check its work) + `mellum-acceptance`
(phase-scoped, nav-complete contract) + `mellum-ncm` (re-run the contract at
settle and redispatch the unmet concept). No cap — so no `cap-turns` × `ncm`
deadlock. Each piece earns its place: drop nonblock and 2/3 stall (arm 1); leave
the contract whole-roadmap/lax-nav and the gate demands the wrong thing (arm 2).

Arm 1 is the gate alone; its 0/3 is a stall upstream of the gate, recorded in
the deadlock note. **Arm 2 adds `tool/background-long-commands`**: it backgrounds
the server the worker launches to check its work, so no rep stalled — all three
reached settle and the gate engaged on every one. The rate held at 1/3, but the
failure shape changed from *dead stalls* to *near-misses* (`miss=1`), and the two
fails split into two distinct causes:

- **A proxy gap (rep 1890ec).** The gate's own contract went **green** (8 passed)
  while the hidden grader still failed `test_home_still_has_navigation_links`.
  The contract's nav check accepted any `<nav>` or any `<a href>`; the spec
  (`roadmap.md`) names specific links — brand "AgentClinic", Home → `/`,
  Complaints → `/complaints` — and the hidden grader checks exactly those. The
  contract was **incomplete**: it let the worker settle a page the spec's own
  requirement rejects. This is a contract-completeness bug, fixable from the
  spec (agnostic — the routes are in `roadmap.md:20`, not read from the grader).
- **Redispatch exhaustion (rep b27fce).** The contract was correctly **red**
  (6 failed) but the worker never got it green within `NCM_MAX=5`: it built
  `templates/index.html` not `home.html` and the root never returned the tagline.
  A convergence limit, not a contract bug.

**Measured (arm 3), was the conjecture.** Completing the contract — phase scope
plus spec-named nav-link assertions — lifted easy from 1/3 to 3/3 at n=3. The
proxy-gap fail became a catch the gate redispatched on, and the
redispatch-exhaustion fail went away once the gate stopped demanding phases 2–4.
No separate `NCM_MAX` lever was needed on easy.

**Conjecture (open).** That 3/3 holds on a confirmation run (n=6 total) rather
than being a lucky draw at n=3. Until then it is a strong lead, not a rate.

## What would falsify this / Risks

- **Completed contract, still 1/3.** Then the nav proxy gap was not the binding
  constraint — the model cannot act on the redispatch even when the gate is
  right, and easy's ceiling is a convergence problem, not a gate-completeness one.
- **Over-tight contract false-fails a correct page.** The nav assertion must be
  mutation-proven: green on `known-good`, red on a page missing a named link,
  and it must not reject a correct page that structures its navbar differently
  than the fixture. The hidden grader stays the oracle.
- **Small n.** Three reps an arm. Each row is a screen, not a rate.
