# Lesson 8's run at n = 3: steps against one brief

Date: 2026-10-27, from the preregistration
[2026-10-27-prose-brief-preregistration.md](2026-10-27-prose-brief-preregistration.md),
written before the run. LC.17A, lesson 8, "A prose brief stops at its first
reply".

**What is measured.** The medium suite's four phases carried two ways — the
suite's own four briefs sent as steps, against the same four joined into one
brief with `--single-prompt` — at n = 3 per arm, on one machine. A **screen**:
three sessions per arm, no rate.

**What is conjecture.** That the joined brief causes a worker to stop after the
first thing it reads. These six sessions do not show that mechanism; they show
an outcome, and the outcome has at least three distinguishable causes.

## What ran

Six sessions, no censors, no contamination, nothing written outside the layout,
all six ended `agent_settled`.

| Arm | Session | Missing | Checks ran | phase 1/2/3/4 missing | Requests | Peak input | Output | Wall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| steps | `d534ce` | 11 | yes | 3 / 3 / 1 / 4 | 95 | 11,683 | 59,408 | 1867 s |
| steps | `eda435` | 9 | yes | 0 / 4 / 2 / 3 | 81 | 9,084 | 37,561 | 1123 s |
| steps | `df4046` | **1** | yes | 0 / 1 / 0 / 0 | 67 | 10,353 | 34,539 | 990 s |
| one-brief | `5d9dfb` | 18 | **no** | — | 16 | 21,100 | 19,554 | 697 s |
| one-brief | `705bdd` | 18 | **no** | — | 36 | 1,238 | 15,340 | 421 s |
| one-brief | `a26728` | 18 | **no** | — | 49 | 3,213 | 33,295 | 1029 s |

Passes: **0/3 in both arms.**

## The rule, applied

1. **Context does not hold.** The rule required every one-brief session's peak
   input below every steps session's. `5d9dfb` peaked at 21,100 against the
   steps arm's highest 11,683, so the page says the context difference did not
   hold. Medians are 10,353 steps against 3,213 one-brief, which is why one
   session is not enough to state it.
2. **Requests and wall do hold, 3 of 3.** Every one-brief session used fewer
   requests (16, 36, 49 against 67, 81, 95) and less wall (421, 697, 1029 s
   against 990, 1123, 1867 s). Stated as three of three sessions, not as a rate.
3. **Phases: the one-brief arm has no reading at all.** Its checks never ran in
   any session, so the per-module columns are empty rather than missing a phase.
4. **Checks ran: 3 of 3 against 0 of 3.** This is the strongest claim the run
   supports, and it is a presence/absence claim, which is what n = 3 is for.
5. No censors, so nothing is excluded as censored; the three `checks_ran: false`
   sessions are excluded from the check comparison and reported here.

## Why the checks did not run

Each one-brief session ended with a workspace the grader could not import, and
each for its own reason. The final replies did not say so:

| Session | What the workspace was missing | Grader's error | What the model said |
| --- | --- | --- | --- |
| `5d9dfb` | no `models.py`, no `templates/` | `ModuleNotFoundError: No module named 'models'` | nothing — no final text |
| `705bdd` | no `models.py` | `ModuleNotFoundError: No module named 'models'` | "Phase 1 — Home Page has been implemented. The test command … exits 0" |
| `a26728` | no `templates/`, a file that does not parse | `SyntaxError: unterminated string literal` (line 29) | nothing — no final text |

So the joined brief did not make the worker stop reading; it made it finish with
an incomplete project and, twice, with no final at all. The most confident
message of the six — "implemented … exits 0" — belongs to a session whose
grader could not open the project.

## What the page can now say

- **The joined brief was faster and cheaper**: fewer requests in every session,
  less wall in every session, and — in two of three — less peak context. The
  context claim the page used to make is not supported.
- **It did not produce a runnable project in any of three sessions**, while the
  stepped shape did in all three. That is a stronger claim than "stops at its
  first reply" and a different one: the observable failure is the workspace.
- **The steps arm had its own bad sessions**: 11 and 9 missing checks in two of
  three, including 3 of 4 phase-1 checks lost in `d534ce` — a layout regression
  the Pathologies page carries.

## What would falsify this

- A one-brief session whose checks run would break "0 of 3" as a shape claim,
  and one that runs *and passes* would make the comparison much less interesting.
- A steps session that fails to import would say the importability is a property
  of the worker or the briefs rather than of the joined shape.
- Six sessions on one machine cannot separate "the joined brief" from "these
  four briefs joined"; a different task family is the next instrument.

## Risks

- **Quoting 3 of 3 as a rate.** It is three sessions; the page says three of
  three and does not convert it.
- **Reading the requests drop as an improvement.** Cheaper and broken is the
  finding, not a trade-off.
- **The old claim's shape is seductive.** "Stops at its first reply" is a better
  story than "leaves a project nothing can import", and the record does not
  support the first.

## Raw evidence

Published as
[`research-2026-10-27-prose-brief.tar.gz`](https://github.com/pauleveritt/mellum-worker/releases/download/research-2026-10-27/research-2026-10-27-prose-brief.tar.gz)
on the `research-2026-10-27` release: six run directories with `run.json`,
`trace.jsonl`, `layout.json`, `leaked.json` and `prompt.txt`, `workspace/` and
`profile/` excluded, plus the three workspace file lists that show what each
one-brief session failed to create.
