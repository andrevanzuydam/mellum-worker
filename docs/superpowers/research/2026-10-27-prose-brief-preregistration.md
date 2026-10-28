# Preregistration: lesson 8 at n = 3, steps against one brief

Date: 2026-10-27, written before the run. LC.17A, lesson 8, "A prose brief stops
at its first reply".

**What is measured.** Two shapes for the same four phases of the medium suite:
the suite's own four briefs sent as steps, against the same four joined into one
brief with `--single-prompt`. Six sessions, **n = 3 per arm**. This is a
**screen**, sized at n = 3 because the page states a comparison — one session
per arm, which is what it rests on today, cannot support one.

**What is conjecture.** That either shape causes the worker to stop after phase
one. The 2026-10-25 screen did not show that, and this run is not designed to
rescue the old claim; it measures the two shapes as they are.

- Backend: `llama-server` 0.7.0, Mellum 2.1 `Q4_K_M`, `-c 50000`, `127.0.0.1:8002`.
- Machine: **Apple M1 Pro, 8 cores, 32 GiB.**
- Sampling: the learner's profile — `temperature 1`, `top_p 0.95`, `top_k 20`,
  `max_tokens 16384`.
- Runner: `uv run python learn/code/harness.py run --suite medium --specs joined
  --arm worker --repeat 3 --grade --deadline 2700`, once as shipped and once with
  `--single-prompt`, under `caffeinate -dims`.

**Deadline 2700 s**, unchanged: medium's slowest recorded session is 1607 s.

**Reading.** Per session from `run.json`: `passed`, `failed_checks`,
`check_groups` (per-module — new since the page's last evidence), `requests`,
`context`, `output_tokens`, `wall`, `deadline`, `checks_ran`. Per arm: the three
sessions of each.

**Decision rule, fixed before the run.**

1. Report both arms session by session. No rate, no percentage.
2. **Context:** if every one-brief session's peak input is below every steps
   session's, the page states it as three of three. Otherwise the page says the
   context difference did not hold.
3. **Phases:** the per-module reading says which phase's checks are missing. If
   one shape loses a phase the other keeps, in every session, the page states
   that; otherwise it says the shapes did not differ on phases.
4. **Passes:** report the counts. Two of three against three of three is a
   difference of one session and is stated as such, never as a rate.
5. A censored session is censored; a session whose checks did not run is
   reported as such and excluded from the check comparison.
6. No arm, n, deadline or reading changes after the run.

**Either outcome publishes.** The page states what the six sessions show and
keeps its `screen` badge; a `reference-run` would need a preregistered run on a
claim worth promoting, which this is not.

**Raw evidence.** Six run directories go to a `research-*` release with
`workspace/` and `profile/` excluded.
