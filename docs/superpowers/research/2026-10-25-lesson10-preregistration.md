# Preregistration: lesson 10, one joined roadmap against one file per phase

Date: 2026-10-25, written before the run. LC.19, lesson 10, "One spec file per
phase".

**What is measured.** Whether the layout of a phased project's requirements
changes which hidden checks fail: one joined `specs/roadmap.md` against one
`specs/phase-N.md` per phase, with both arms sending the same thin briefs.
Screen only: **n = 3 per arm**, no rate, and no wall compared with another
machine. This run is the evidence for the lesson's page, and for a
`reference-run` badge only if the rule below fires.

- Backend: `llama-server` 0.7.0, Mellum 2.1 `Q4_K_M` `-c 50000`
  (`n_ctx` 50,176), `127.0.0.1:8002`.
- Machine: **Apple M1 Pro, 8 cores, 32 GiB.**
- Sampling: the learner's profile — `temperature 1`, `top_p 0.95`, `top_k 20`,
  `max_tokens 16384`.
- Runner: `uv run python learn/code/harness.py run --suite medium --arm worker
  --specs <joined|split> --repeat 3 --grade --deadline 2700`, once per arm.

**Deadline: 2700 s, fixed here before the run.** LC.24's medium `worker`
sessions on this machine ran 587–1351 s, both arms inside the same suite, and
2700 s is roughly twice the slowest. These briefs are thinner than LC.24's, so
a session may spend longer or shorter; the deadline is a censor limit, not a
reading. Medium is the only suite, because the hard suite floors at 0/9 for
every arm and has no headroom for any reading.

**Arms, one change between them.** Both send four thin briefs. The briefs are
byte-identical except for the file the pointer names, and a test pins that
(`test_medium_ships_both_spec_variants`).

| Arm | Workspace | Briefs point at |
| --- | --- | --- |
| `joined` | The project as shipped: `specs/roadmap.md` holds all four phases, `AGENTS.md` says so | `specs/roadmap.md` |
| `split` | `specs/roadmap.md` removed; `specs/phase-1.md` … `phase-4.md` instead; `AGENTS.md` says one file per phase | `specs/phase-N.md` |

Same suite, same base project, same grader, same `expected.json`, same worker
(prompt v5, seven tools, nudge, loop breaker, project facts).

**Cost.** 6 sessions on medium, roughly 600–1400 s each: about 1.5 h, up to
2.3 h. Worst case, if every session censors, 4.5 h.

**Reading.** Per session, from `run.json`: `specs` (to confirm the arm),
`passed`, `failed_checks`, `missing_checks`, `check_groups` for the four grader
modules, requests, tool errors, peak input tokens and wall; and from the run
directory, whether a `deadline` marker exists.

- **Primary reading:** the `missing` count of `test_phase4_resolve_reopen.py`,
  out of its 5 checks. The digest's finding was the last phase's automatic id,
  which lives in that module.
- **Secondary:** which modules carry `missing > 0`, and so how far the session
  got in phase order. Passes are context, not the reading: medium floors at 0/3
  for both arms in LC.24, and a refused phase-4 check can only be visible here.
- `failed_checks` is read with `missing_checks` beside it: the count alone
  cannot say which phase a session stopped in.

**Decision rule, fixed before the run.**

1. A contaminated session is excluded and reported.
2. A session the deadline ended is **censored**, never a failure. If an arm has
   fewer than two uncensored sessions, the arm is **void** and the page says so
   rather than reading it.
3. Compare the phase-4 missing counts. If every uncensored session of one arm
   misses strictly fewer phase-4 checks than every uncensored session of the
   other, the page states the difference as a count of sessions at n = 3.
4. Otherwise the page states a **null** for this arm: the layout did not
   separate the checks, and steps 3 and 5 stay `screen`.
5. No arm, suite, n, deadline, prompt or reading changes after the run. A run
   that is cut short is reported, not rescued.
6. If the two arms tie on phase-4 and differ only on a later module, that is
   reported as "no separation in phase order", not as a partial win.

**Either outcome publishes.** A null is the likelier outcome for a 12B model on
a four-phase build, and it is a result: it says the layout does not decide
which phase a small worker reaches, which is what a learner needs to know
before reorganising a project. The cycle ships the page either way.

**What would falsify this.** A `joined` run whose workspace lacks
`specs/roadmap.md`, or a `split` run whose workspace still holds it, means the
overlay or the deletion did not apply and the arm is not what its record says.
A `specs` field that does not match its arm is the same finding. Both arms
missing all five phase-4 checks in every session would say the thin briefs
removed the requirement's teeth, and the finding would be about the instrument,
not the layout.

**Raw evidence.** Run directories (`run.json`, `trace.jsonl`, `prompt.txt`,
`layout.json`, `deadline` when present) go to a `research-*` release with
`workspace/` and `profile/` excluded; nothing is committed to Git.

## Amendment 2026-10-26: attempt 1 aborted before any session completed

Attempt 1 started 16:57:24Z with the arms, n, deadline and reading exactly as
above, joined first. Session 1 hung at 16:59:59Z: the last trace row is
`tool_call bash {"command": "uv run --frozen python app.py"}` with no
`tool_result` after it, and that `python app.py` was still running 57 minutes
later. This is the foreground-server pathology already carried in
[`BACKLOG.md`](../../../BACKLOG.md#backlog), on the `worker` arm, whose own facts
block says `Do not: start servers`.

**The 2700 s deadline did not fire, and the reason matters more than the hang.**
`run_suite` bounds each child with `child.wait(timeout=remaining)`, and
`remaining` comes from `time.monotonic()`. Darwin's monotonic clock does not
advance while the machine sleeps. The Mac slept during the attempt (last wake
17:52:39Z), so after 62 minutes of wall the harness had counted roughly 8 of its
45. A `sample` of the harness showed it inside `Popen._wait`'s `time.sleep` poll:
waiting, not deadlocked.

**No session completed.** The run directory `20261026T165724Z-medium-a9a85c` has
no `run.json` and no `deadline` marker, so nothing here is scored, censored, or
excluded, and no outcome is being rescued. The arm itself was applied correctly
before it hung: `AGENTS.md` and the briefs both pointed at `specs/roadmap.md`,
and that file was present — the second falsifier above did not fire.

Attempt 1 is evidence, kept outside Git at `/tmp/lc19-attempt1`: `trace.jsonl`
(115 rows), `prompt.txt`, `sessions/`, and the workspace's `AGENTS.md` and
`specs/roadmap.md`. Its trace belongs with whatever release publishes this
lesson's runs.

### Attempt 2, fixed before it runs

- **Arms, n, suite, worker, reading and decision rule: unchanged.** The abort
  changed nothing a result depends on.
- **Environment:** the whole run is wrapped in `caffeinate -dims`, so no sleep
  can stretch the deadline. An environment fix, not a design change.
- **Deadline stays 2700 s.** Lowering it after an abort would be tuning, and
  LC.24's slowest medium session was 1351 s, so 2700 still leaves 2×.
- **Censor policy unchanged.** A hang burns its deadline and is reported
  censored, never failed. Fewer than two completed sessions in an arm makes
  that arm void, and the page says so with the hang named.
- **Cost, corrected:** 6 sessions at 10–23 min if they behave (1–2.3 h), plus up
  to 45 min for every session that hangs. All six hanging is ~4.5 h and two void
  arms; the rule above already covers that outcome.

**Conjecture, labeled as such.** LC.24's medium `worker` arm, with the detailed
step-list briefs, never hung (walls 587–1351 s). The thin briefs here leave the
model to decide how to check its own work, and its first choice was to start the
server in the foreground. If both arms hang the same way, the finding is about
the briefs and the pathology, not about spec layout — and it belongs to LC.7A's
foreground-server question rather than to this lesson.

**What would make attempt 2 moot.** A worker-level fix, such as the dormant
server guard on `lc11b-server-guard` (`420ba1d`). It is out of scope here: a
guard change needs its own screen and re-baseline, and this cycle must not move
the worker under the lesson it measures.
