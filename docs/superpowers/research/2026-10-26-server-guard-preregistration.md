# Preregistration: the foreground-server guard, worker against guard

Date: 2026-10-26, written before the run. LC.7A's foreground-server question,
measured as an arm rather than shipped as a default.

**What is measured.** Whether refusing a foreground server start costs a run
anything on the medium suite, and whether it had anything to refuse. Two arms,
n = 3 each, six sessions:

| Arm | What runs |
| --- | --- |
| `worker` | The Baseline Worker as shipped: prompt v5, seven tools, nudge, loop breaker, project facts — the facts bullet `Do not: start servers` is in the block |
| `server-guard` | The same, plus `blockForegroundServer`: a `bash` call that starts a server in the foreground is refused with the `TestClient` form and the detached `nohup … &` form |

- Backend: `llama-server` 0.7.0, Mellum 2.1 `Q4_K_M` `-c 50000`, `127.0.0.1:8002`.
- Machine: **Apple M1 Pro, 8 cores, 32 GiB.**
- Sampling: the learner's profile — `temperature 1`, `top_p 0.95`, `top_k 20`,
  `max_tokens 16384`.
- Runner: `uv run python learn/code/harness.py run --suite medium --arm <arm>
  --specs joined --repeat 3 --grade --deadline 2700`, once per arm, wrapped in
  `caffeinate -dims`.

**Why only two arms.** The three-way question was bullet alone / guard alone /
both. The bullet alone is the shipped `worker`, and guarding without the bullet
(`no-facts-guard`) answers a question nobody is asking: the bullet is shipped, it
was ignored twice in LC.19, and what matters is whether the guard changes
behaviour beside it. Adding the third arm would double the night for a comparison
of a block nobody ships. Recorded here as a deliberate trim, not an oversight.

**Deadline 2700 s**, unchanged from LC.19's arm: medium's slowest recorded
session is 1607 s.

**Reading.** Per session from `run.json`: `guard_blocks` (the refusals the model
was told about — a blocked call leaves no trace row, because the guard stops the
event chain before the recorder), `checks_ran`, `failed_checks`, `check_groups`,
`requests`, `wall`, and whether a `deadline` marker exists. Per arm: the totals.

`guard_blocks` is new and its marker is the refusal's first sentence; the harness
test pins it against a synthetic trace and the guard's own test pins the phrase
on the extension side. A run whose `guard_blocks` is 0 has not shown the guard
was needed, only that it did not fire.

**Decision rule, fixed before the run.**

1. A censored session is censored, never a failure. A session whose checks did
   not run is reported as such and excluded from the check comparison.
2. **Did it cost anything?** If `server-guard` spends more than 1.25× the
   `worker` arm's mean requests, or more than 1.25× its mean wall, the guard is
   reported as a budget cost on this suite, with the numbers.
3. **Did it have anything to refuse?** If `worker` runs with zero `guard_blocks`
   — trivially true, it has no guard — the question is whether any `worker`
   session *would* have been refused: a `bash` command in the `worker` arm's
   trace that `isForegroundServer` matches and that has no `tool_result` after
   it. That count is reported for both arms.
4. **Did it prevent a hang?** If any `worker` session hangs and no
   `server-guard` session does, the guard is reported as preventing a hang on
   this task. If neither arm hangs, the guard is **not needed on medium with
   these briefs**, and the page says that instead of arguing from a pathology
   that no longer appears.
5. No arm, n, deadline or reading changes after the run.

**Either outcome publishes.** The likely outcome is "nothing to refuse, no cost":
LC.19's four attempts hung twice and then stopped hanging once the briefs named
the verification loop, so the guard may be belt-and-braces. That is worth
recording precisely because it decides whether the guard ships in Baseline Worker
v2 or stays dormant.

**What would falsify this.** A `worker` session whose trace carries a foreground
server call with no `tool_result` — a hang the guard would have prevented — and a
`server-guard` session that completes. Or a `server-guard` session with
`guard_blocks > 0` that then spends its deadline looping, which would say the
refusal needs a shorter, more actionable alternative.

**Raw evidence.** Run directories go to a `research-*` release with `workspace/`
and `profile/` excluded; nothing committed to Git.
