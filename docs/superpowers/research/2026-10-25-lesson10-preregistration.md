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

**Outcome:** one censored session, no completed session, so the `joined` arm
is void and there is no comparison. See the
[run record](2026-10-25-lesson10-run.md).

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

## Amendment 2026-10-26 (2): attempt 3, before it runs

Two attempts hung on a foreground server, so the instrument changed before a
third. Three edits, each tied to a cause visible in the traces, and all applied
to **both** arms so the only difference between them is still the pointer.

1. **The roadmap asks for an in-process check.** Phase 1's stories keep
   `uv run python app.py` as a deliverable and add: "As the operator, I want the
   home page exercised in process with `TestClient`, so a change can be checked
   without a running server." Cause: attempt 1's own reasoning used the story's
   server line as its verification — "we should verify that the app can be run
   with `uv run python app.py`" — and then ran it.
2. **The base project ships a test.** `medium/base/tests/test_home.py` exercises
   the home route with `TestClient` (status 200, the tagline, the shared
   navigation), so the facts block's `uv run --frozen python -m pytest tests`
   has something to run on the first turn. Cause: attempt 1 had no test at all;
   attempt 2 wrote its own, got a 422 it could not explain, and went to a live
   server to see the response.
3. **Both briefs name the loop.** Every phase brief now ends: "Check your work
   with `uv run --frozen python -m pytest tests`; do not check it by starting a
   server." A positive instruction, not a prohibition — `Do not: start servers`
   was already in the facts block and was ignored twice.

Tests that hold these: `test_the_thin_briefs_name_the_verification_loop`,
`test_medium_base_ships_a_phase1_smoke_test`,
`test_medium_asks_for_the_home_page_in_process`, and the existing
`test_the_split_keeps_the_roadmaps_phases` and
`test_medium_ships_both_spec_variants`. `medium: QUALIFIED`.

**Unchanged:** arms (`joined` against `split`), n = 3 per arm, `--arm worker`,
the phase-4 `check_groups` reading, the decision rule, and `--deadline 2700`.
The run is wrapped in `caffeinate -dims` as attempt 2 was.

**What the change costs the records:** medium's base project is no longer the
one LC.24 ran, so this run's walls and check counts are comparable only within
the run, not against LC.24's medium numbers. The visible test is the worker's
loop, not a gate: `known-broken` passes it too, and the hidden grader still
fails that fixture.

**What would falsify the diagnosis.** A session that starts a server anyway,
with all three in place, says the behaviour is not instructional and a guard is
the only remedy — which is exactly the answer LC.7A's arm wants.

## Amendment 2026-10-26 (3): attempt 4, before it runs

Attempt 3's one session finished all four phases in 840 s and then scored 18/18
missing because two grader modules hit `ModuleNotFoundError: No module named
'models'` and pytest aborted collection. Phase 1 alone passed 3 of 4. The spec
never asked for `models.py`; the detailed prompts had, the thin briefs could
not. Two instrument changes follow, both applied to **both** arms.

1. **The spec carries the acceptance criteria.** `medium/specs/tech-stack.md`
   gains a project layout table (`app.py`, `models.py` holding `Complaint` and
   the module-level `complaints` list, `templates/`, `tests/`) and the markup
   conventions (html5 doctype, `lang="en"`, brand and nav links, one `.card` per
   complaint, `Open`/`Resolved`). `medium/specs/roadmap.md` gains a
   **Acceptance** list per phase, and the four `spec-variants/split/specs/` files
   carry the same lists — `test_the_split_keeps_the_roadmaps_phases` enforces
   the lockstep.
2. **Checks that never ran say so.** `run.json` gains `checks_ran`, false when
   pytest exits with a collection error, so a record with every expected check
   missing cannot be read as the worker failing every check. It was first
   written as `grader_error` and renamed before this run: an empty workspace
   fails collection too, so the flag describes the checks, not a faulty grader.
   The session still fails; it just records why the count is full. A session
   with `checks_ran: false` is reported separately and not compared as if its
   checks had run.

**Unchanged:** arms (`joined` against `split`), n = 3 per arm, `--arm worker`,
the phase-4 `check_groups` reading, the decision rule, `--deadline 2700`, and
the `caffeinate -dims` wrapper.

**Cost, measured from attempt 3:** that session took 840 s, so six sessions are
roughly 1.5 h, and censors cost 45 min each if the briefs stop working.

**What the change costs the records:** medium's base project is now further from
LC.24's, so walls and check counts compare only within this run. The acceptance
lists are derived from the grader's own modules, which means the spec states
what is measured; a future edit to the graders owes the same edit to the spec.

**What would falsify this.** A session with `grader_error: true` under the new
spec would say the layout is still not stated clearly enough. Both arms reaching
phase 4 with 0–1 missing checks would leave no headroom to separate them, and the
reading would be a null for that reason rather than for layout.
