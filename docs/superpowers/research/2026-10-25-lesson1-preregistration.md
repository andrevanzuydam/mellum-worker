# Preregistration: lesson 1, bare against the worker, easy and medium

Date: 2026-10-25, written before the run. LC.24, lesson 1, "The primary agent
is the wrong worker".

**What is measured.** Whether the primary agent (`bare`) passes where the
bounded worker (`worker`) does, on the easy and medium suites. Screen only:
**n = 3 per arm per suite**, no rate, and no wall compared with another
machine. This run is the evidence for a `reference-run` badge on steps 3 and 5
of the page.

- Backend: `llama-server` 0.7.0, Mellum 2.1 `Q4_K_M`, `-c 50000`
  (`n_ctx` 50,176), `127.0.0.1:8002`, `scripts/backend.py start`.
- Machine: **Apple M1 Pro, 8 cores, 32 GiB.**
- Sampling: the learner's profile — `temperature 1`, `top_p 0.95`, `top_k 20`,
  `max_tokens 16384`.
- Runner: `uv run python learn/code/harness.py run --suite <suite> --arm <arm>
  --repeat 3 --grade --deadline 2700`, once per suite and arm.

**Deadline: 2700 s, fixed here before the run.** It is not the 1800 s the spec
first proposed, and the reason is arithmetic on existing records. LC.17's
medium `worker` sessions finished at 894 s and 961 s on this machine. The
45-session baseline ran medium `bare` at 359 s against `worker` at 204 s, a
ratio of 1.76, so medium `bare` here is projected at 1570–1690 s — 87–94% of
an 1800 s deadline, which one slow session would censor. 2700 s covers the
projection with 60% margin. Easy never exceeded 486 s in the 2026-10-24
record, so the value is inert there; one value is used for both suites.

**Arms, one change between them.**

| Arm | What runs |
| --- | --- |
| `bare` | Pi with no extension: the primary agent, Mellum as the model in charge, Pi's own prompt and seven file tools |
| `worker` | The shipped worker: prompt v5, the same seven tools, the empty-final nudge, the loop breaker and project facts |

**Cost.** 12 sessions: easy at roughly 190–600 s each, medium at roughly
900–1700 s each. About 2.5 h of wall, 3 h if sessions censor.

**Reading.** Per session: passed, failed checks, tool errors, peak input
tokens, wall, and the event the session ended on (`agent_settled` or a
`deadline` marker). Per arm and suite: passes out of three.

**Decision rule, fixed before the run.** For each suite separately:

- If `worker` passes strictly more sessions than `bare`, the page states the
  difference as a count of sessions at n = 3.
- Otherwise the page states a null for that suite.
- No arm, suite, n, deadline or reading changes after the run.
- A session the deadline ended is reported as **censored**, never as a failure.

**Either outcome publishes.** A null on medium returns steps 3 and 5 to
`screen` and the page says so; the exemplar is the process — one
preregistration, one record, one badge change — not the result.

**What would falsify this.** A `bare` request whose payload carries
`Project facts:` would mean the extension loaded in the wrong arm. A `worker`
arm passing zero sessions on both suites would point at the harness or the
backend rather than at the policy.

**Raw evidence.** Run directories (`run.json`, `trace.jsonl`, `prompt.txt`,
`layout.json`) go to a `research-2026-10-25` release with `workspace/` and
`profile/` excluded; nothing is committed to Git.
