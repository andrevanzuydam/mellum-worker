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
