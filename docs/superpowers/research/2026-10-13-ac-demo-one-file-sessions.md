# ac-demo sessions on the one-file roadmap: the model's own test decides done

Date: 2026-10-13. Two interactive ac-demo sessions on 2026-10-12 and
2026-10-13 went badly; Paul had a separate Fable session read the Pi
session files and relayed its report. Paul checked one claim against the
session file (the Phase 2 run weighed "complete one task" against the
roadmap's four phases and moved on to Phase 3) and relays the rest as
reported. This note records it as an input to M.11, not as a measurement.

**What is measured.** Nine Mode runs on ac-demo's one-file `specs/roadmap.md`:
five of Phase 1 (one errored after a single request), three of Phase 2, one
of Phase 3; eight ran. Counts are from reading the session files, by one
reader, unchecked except for the claim above.

**What is conjecture.** Why the Phase 2 run continued into Phase 3; whether
the nudge wording took part; any rate, at n = 3 per phase.

## What the eight runs showed

| failure | runs | reading |
| --- | --- | --- |
| the model's own test decides when it is done, and that test is wrong or missing | 3 | the pattern behind the rung 9 id miss, seen on three other requirements |
| a false success claim in the final reply | 2 | follows from the row above |
| `tech-stack.md`'s model conventions skipped (no dataclass, `created_at` for `timestamp`) | 3 of 3 Phase 2 | harmless until a test or a later phase depends on the name |
| an error misread and the wrong thing fixed | 4 episodes | short, and self-corrected, except where the wrong test drove the loop |
| the run continued past its phase | 1 of 3 Phase 2 | 222 of the session's 333 s and 20k of its 35k output tokens |
| an empty turn, recovered by one nudge | 2 of 3 Phase 2 | the shipped guard working |

The three cases of the first row: a Phase 3 test without
`follow_redirects=False`, so the redirect was followed and the assertion
was wrong; a Phase 3 run that wrote no POST test and reported success; no
run tested the `python app.py` startup requirement, and two of four Phase 1
runs got it wrong. On 2026-10-13 the wrong test was too strict rather than
too weak: the mirror image of the id miss, the same mechanism.

## Why Phase 2 kept going

The transcript shows the model setting the prompt's "complete one task"
against the four phases in one file and choosing to go on. The report says
the model quoted the nudge text ("Continue: run the next step") as the
user's words; Paul did not check that quote. In the 2026-10-12 session the
same nudge was followed by a stop. A lead, not a rate.

## What follows

- **The prompt and the guards stay as they are.** Both are measured, and the
  run-on is one in three.
- **ac-demo's roadmap changes three lines** (done 2026-10-13, in ac-demo):
  the preamble says a request names one phase and the run ends when that
  phase's tests pass; Phase 1's test line covers the startup requirement;
  Phase 2 names the field `timestamp`. The ladder's one-file roadmap builds
  its own preamble, so nothing measured moves.
- **M.11 design inputs.** The test the main model writes comes from the phase
  bullets and `tech-stack.md`; a bullet without a test gets one or is marked
  as not tested. The missing and wrong tests are covered by construction;
  the startup line and the field name only if the test names them; quick
  misreads inside the loop are not covered and are cheap.
- **Not pursued:** a "follow tech-stack.md" line in `AGENTS.md` (no run
  reads a file it is not pointed at, and the failing run was at 52k of a 56k
  context); requiring a dataclass (cosmetic); measuring roadmap shape or
  nudge wording ([rung 9 screen](2026-10-13-rung9-screen.md) holds that lead).

The backlog entry "Phase 4 ids" is folded into M.11 by this note: the id
miss, the missing POST test, the wrong redirect test and the untested
startup line are one mechanism, and M.11 is the phase that addresses it.

## What would falsify this

- Phase 2 runs still crossing into Phase 3 after the preamble change, at a
  similar rate: the roadmap text was not the lever.
- M.11's screen passing rung 9 no more often with a written test: the done
  criterion is not what Mellum optimises.

## Risks

- One reader of the session files, counts unchecked; the quoted-nudge claim
  unverified.
- Interactive sessions on an unreset tree; earlier runs' files were on disk.
- Three changed lines in the demo spec can change what a recording shows
  without changing what the ladder measured.
