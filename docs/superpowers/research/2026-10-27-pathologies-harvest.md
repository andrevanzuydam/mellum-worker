# Harvest: pathologies pages in sibling projects

Date: 2026-10-27. Two existing catalogues read for **form and vocabulary**, not
evidence: their observations are other models on other harnesses, and this
repo's page only cites records it can point at.

## What was harvested, and what was not

| From | Taken | Not taken |
| --- | --- | --- |
| `swiftstar/docs/pathologies.md` (65 lines, 12 entries) | The entry shape: a numbered **bold name**, one or two plain sentences, a provenance footer | Its evidence — repair/editing runs on a different harness |
| `ds4-engine/docs/pathologies.md` (885 lines, grouped by project and model) | The three framing rules (an entry needs an observation; **a reference, not a denominator**; model and project named on each entry), the habit of keeping an entry that turned out to be a harness or engine fault, and grouping | Its 47 entries, its numbering, its `remediations.md` companion for now — one page with an `Answer:` line per entry is enough at 13 entries |
| `ds4-engine/docs/remediations.md` | The idea that a remedy built but never measured says so in those words | A second file; noted here as the escape hatch if the page outgrows one page |

## Names worth borrowing

Sharper than the digest's phrasing, and used on the page where the observation
is ours: *talk yourself out of the answer*, *blame the wrong cause*, *content
trap*, *silent framework substitution* (as **builds it somewhere else**),
*generation-repetition exhaustion* (as **a loop**), *deadlock on an
underspecified instruction*.

## Their entries against our observations

| Their pathology | Do we have our own observation? | Where |
| --- | --- | --- |
| Delivery under-count | no | — |
| Talk yourself out of the answer | no — nearest is the ditch's false success | `learn/getting-started/ditch.md` |
| Blame the wrong cause | no | — |
| Round-2 self-copy | no | — |
| Format collapse | no | — |
| Generation-repetition exhaustion | **yes**, as a loop | `2026-10-26-server-guard-run.md` (the smoke looped ~4 min retrying refused commands); the loop breaker is unmeasured (`learn/lessons/guards-for-empty-turns.md`) |
| Placeholder tool-call syntax | no | — |
| Tool call inside `<think>` | no | — |
| Deadlock on an underspecified instruction | no | — |
| Silent framework substitution | **yes**, as builds-it-somewhere-else | `2026-10-25-lesson10-run.md` attempt 3: `Complaint` in `app.py`, so the grader's `models` import fails |
| Engine false positive (64-dash separator) | **close analogue**: the monotonic deadline and the leak sweep are our harness faults that read as model faults | `2026-10-25-lesson10-preregistration.md` (sleep-stretched deadline), `BACKLOG.md` (sweep misses own-group servers) |
| Content trap, repeated | no — nearest is the `Complaint` dataclass without a default `timestamp` | `2026-10-25-lesson10-run.md` attempt 4 |
| P1 The runaway search (Andre) | **no here-record**; digest only | `2026-10-24-pr-harvest-index.md` P1 |
| P2 The server that never returns (Andre) | **yes, four times** | `2026-10-24-project-facts-screen.md`, `2026-10-25-lesson1-run.md`, `2026-10-25-lesson10-run.md` |

## What this means for the page

- Entries with a here-record cite it. Entries whose only observation is another
  project's say **`Seen elsewhere:`** and name the source — the runaway search is
  the only one, and it is marked that way rather than dropped, because the
  roadmap row names it and a learner will meet it.
- Two harness faults are on the page as harness faults, following ds4-engine's
  convention: the sleep-stretched deadline and the un-swept server. A reader who
  thinks a catalogue is only about models will mis-file them, which is the
  mistake worth avoiding.
- No entry is a rate. Their strongest rule — a reference, not a denominator —
  is the page's own, because ours were collected the same opportunistic way.
