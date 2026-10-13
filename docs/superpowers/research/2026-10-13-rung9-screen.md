# Rung 9 screen: the id miss follows the one-file roadmap

Date: 2026-10-13. An exploratory screen (`docs/sdd.md`: no
preregistration), asked for by Paul after
[A21](2026-10-13-a21-result.md) went 0/3 on rung 9 against the control's
2/3. Records: [light section alone](../../ladder/screen-rung9-light-section/README.md),
[one-file roadmap alone](../../ladder/screen-rung9-one-file-roadmap/README.md).

**What is measured.** Rung 9 (AgentClinic phase 4), Mellum Mode, three runs
per arm, 09:17–09:32 EDT, worker `v0.1.8-1-gb31372b`, Pi 1.1.0: A21's two
changes one at a time. Each failure was rebuilt from its `diff.patch` on the
phase 4 fixture and the hidden tests rerun; they reproduce the scores.

**What is conjecture.** Why the one-file roadmap would produce the id
miss. n = 3 per arm.

## Result

| arm (rung 9) | passes | failures |
| --- | --- | --- |
| light section, phase files | 1/3 | no "Resolved" badge; status `'Open'` not `'open'` |
| A19 section, one-file roadmap | 1/3 | id miss: `id=None`; constructor needs more arguments |

Across every rung 9 run on 2026-10-13, the id miss (`Complaint(agent_name,
text)` without an automatic, distinct `id`) by roadmap shape:

| roadmap | runs | id miss | other failure | pass |
| --- | --- | --- | --- | --- |
| one-file (A21, this screen) | 6 | **5** | 0 | 1 |
| phase files (control, this screen) | 6 | 1 | 2 | 3 |

Neither change alone fell to 0/3, so the backlog entry's reopen condition
is not met. The lead: the one-file roadmap goes with the id miss (5 of 6
against 1 of 6). One guess, unchecked: with every phase in one file,
Phase 2's description of `Complaint` (agent name, text, timestamp) sits
beside Phase 4, and Mellum keeps that model and adds the id elsewhere.

## What would falsify this

A preregistered rung 9 run, one-file roadmap against phase files with the
same section, six or more each, with the id miss at a similar rate in both.

## Risks

- Three runs per arm; rung 9 passes only 1/3 or 2/3 in every arm today, so
  the pass rate cannot separate the arms, only the failure kind can.
- ac-demo keeps its phases in one `specs/roadmap.md`; if the lead holds,
  phase 4 there is likely to hit the id miss.
- Raw evidence is archived locally with the A21 archives
  (`screen-rung9-light-section.tar.gz`
  `501b59825e7b482aceaae8765c0ebddd2310698c557c17513b311768049bf2ff`,
  `screen-rung9-one-file-roadmap.tar.gz`
  `a7b51399a57c37f45afd5cb7c2b96a96e137b32d9a418eeb3e997e56c1ad44f0`), not
  yet attached to `research-2026-10-13`.
