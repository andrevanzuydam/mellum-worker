---
phase: LC
feature_cycle: LC.25
cycle: 1
lifecycle: closed
---

# LC.25 — the two-sentence opening on the seven older lessons

## Why

LC.24 put the rule in `learn/lesson-template.md` and used it on Lesson 1. Seven
pages predate it and open straight at `## Problem`, so a learner's first
sentence from Lesson 1 is a promise the other seven do not keep. The track has
eight lesson pages; `primary-agent.md` is the one that already complies.

This is wording only. No arm is run, no badge changes, and no page gains a
number it does not already carry.

## Decisions taken before this plan

- **Each opener is composed from that page's own Problem and Solution, at that
  page's own badge strength.** Where the page records a null, the second
  sentence says the null; where a page has no arm (`thinking-working-memory`),
  it says what the page does instead of what a change bought. No page's opener
  may state a result its body does not.
- **The rule is enforced once, for every lesson page,** in the shared
  `tests/learn-site.test.mjs`, which already auto-discovers `learn/lessons/`.
  Seven more per-lesson files would each assert the same site-wide rule.
- **The shared check is written and shown failing first, and committed with the
  last page.** Every commit on the branch is green: the intermediate ones carry
  a page edit only, and the check lands once the set it enforces is complete.
- **One grouped `Changed` entry, not seven**, matching LC.13A's close, which
  grouped four re-based pages. It describes one change to the track.
- **`BACKLOG.md` already states the `wall` defect twice.** The two entries are
  folded into one; a third is not added. Consolidation is internal, so it takes
  no changelog line.

## The seven sentences

Each sits between the H1 and `## Problem`, with no heading of its own.

| Page | Opening |
| --- | --- |
| `baseline.md` | Given the whole job, a small model fails most of the suite's sessions and never passes hard, whether it plans or only answers. The page measures the worker boundary against that baseline, suite by suite, as the unit the other lessons change. |
| `short-prompt.md` | A prompt that narrates a six-step procedure gives a small model more to follow than the project needs, and every line is paid on every request. What ships is 643 characters with no procedure, and this run does not show it buying a pass. |
| `thinking-working-memory.md` | Stripping a reasoning model's thinking blocks looks like a cheaper prefill, but the output cap is the budget that binds and the worker's guards read those blocks. This page keeps them and names the arm that would settle the question. |
| `guards-for-empty-turns.md` | A small model can end a turn having said nothing and called no tool, and the run stops there. The shipped guards answer that empty turn and repetition, and the arms here show the nudge never fired rather than that it worked. |
| `project-facts.md` | A small model dropped into a workspace has to infer how the project is built, and a plausible guess survives several turns. The worker appends a short, switchable block of project facts to every request, and this run found no pass moved. |
| `write-only-listed.md` | A run can pass every hidden test and still be wrong, leaving scratch files, a second app copy or a test edited to pass. The page names the layout and checks the file set after each run, which the easy suite never tripped. |
| `prose-brief.md` | Handed a four-phase build as one prose brief, a small model is expected to answer the first thing it reads and call that done. This screen found the opposite, so the page keeps steps for their checkpoints, not for a lost phase. |

Checked mechanically: two sentences each, 40–44 words, no backtick, no link, no
badge.

## Non-goals

- Editing a page's Problem, Eval case, Evidence, Solution, Validation or
  Interpretation, or its badges.
- Lessons 9 and 10: LC.18 and LC.19 take the rule when their pages are written.
- A per-page test file for `baseline` and `short-prompt`, which have none. The
  opener is a site-wide rule, so the shared check is its home.
- Any run, preregistration, research note or `research-*` release.

## Tasks

### Task 1: The shared check, written first

**Files:**
- Modify: `tests/learn-site.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: the check Tasks 2–8 satisfy, one page at a time.

- [ ] **Step 1: Append the check** to `tests/learn-site.test.mjs`:

```js
test("every lesson page opens with the two-sentence paragraph", () => {
  const lessons = PAGES.filter((p) => p.startsWith("lessons/") && p !== "lessons/index.md");
  assert.ok(lessons.length >= 8, "lesson discovery found too few pages");
  for (const p of lessons) {
    const l = page(p);
    const opening = l.split(/^# .+$/m)[1].split(/^## /m)[0].trim();
    assert.ok(opening.length > 0, `${p} has no opening paragraph`);
    assert.equal(opening.split(/(?<=\.)\s+/).filter(Boolean).length, 2, `${p} opening is not two sentences`);
    assert.ok(opening.split(/\s+/).length <= 45, `${p} opening is over 45 words`);
    assert.doesNotMatch(opening, /`|\]\(|\*\*Badge/, `${p} opening carries markup`);
  }
});
```

- [ ] **Step 2: Run it and record the failure.** `node --test tests/learn-site.test.mjs`
  — expect one failure naming `lessons/baseline.md has no opening paragraph`,
  the alphabetically first page. Leave the file uncommitted.

### Tasks 2–8: One page per commit

Each task is the same three steps with its own page and sentence from the table
above: insert the paragraph after the H1 and a blank line, run
`node --test tests/learn-site.test.mjs` and confirm it still fails on a page
not yet done — the check reports the alphabetically first offender, so its
message can lag the commit order by one — then commit that file alone so the
check stays out of the branch until the set is complete. At Task 8 it passes.

| Task | Page | Commit subject |
| --- | --- | --- |
| 2 | `learn/lessons/baseline.md` | `docs(lc25): open the baseline lesson with its two sentences` |
| 3 | `learn/lessons/short-prompt.md` | `docs(lc25): open the short-prompt lesson with its two sentences` |
| 4 | `learn/lessons/thinking-working-memory.md` | `docs(lc25): open the thinking lesson with its two sentences` |
| 5 | `learn/lessons/guards-for-empty-turns.md` | `docs(lc25): open the guards lesson with its two sentences` |
| 6 | `learn/lessons/project-facts.md` | `docs(lc25): open the project-facts lesson with its two sentences` |
| 7 | `learn/lessons/write-only-listed.md` | `docs(lc25): open the write-only lesson with its two sentences` |
| 8 | `learn/lessons/prose-brief.md` | `docs(lc25): open the prose-brief lesson with its two sentences` |

```bash
git commit learn/lessons/<page>.md -m "<commit subject from the table>"
```

### Task 8, continued: the check, the changelog, the index

**Files:**
- Modify: `tests/learn-site.test.mjs`, `CHANGELOG.md`

- [ ] **Step 1: Confirm the whole suite is green** with the check in place:
  `node --test tests/learn-site.test.mjs`, then `npm test`.

- [ ] **Step 2: Changelog.** Under `[Unreleased]` → `### Changed`:

> - All seven older lessons now open the way Lesson 1 does: two sentences
>   between the title and the first heading, the problem then the answer, 45
>   words or fewer. Wording only — no page's evidence, badges or numbers
>   changed.

- [ ] **Step 3: Commit both.**

```bash
git add tests/learn-site.test.mjs CHANGELOG.md && git commit -m "test(learn): hold every lesson page to the two-sentence opening"
```

### Task 9: Fold the two `wall` entries into one

**Files:**
- Modify: `BACKLOG.md`

**Interfaces:**
- Consumes: LC.24's numbers at `BACKLOG.md` and the older entry below it.
- Produces: one entry, one reopen condition, both records cited.

- [ ] **Step 1: Replace both entries** with one, keeping LC.24's heading and
  both evidence links:

> **`run.json`'s `wall` under-reports a censored or stalled session.**
> `report()` in `learn/code/harness.py` derives wall from trace timestamps, so
> a session the deadline ends reports its last traced event: LC.24's two
> censored `bare` sessions show 70 s and 180 s against a 2,700 s deadline, and
> one session killed at 600 s recorded 164 s
> ([run](docs/superpowers/research/2026-10-25-lesson1-run.md),
> [context](docs/superpowers/research/2026-10-24-context-budget-screen.md)).
> Only the `deadline` marker tells the truth, so any table quoting wall beside
> a censored session understates it. The fix is a wall from process lifetime,
> or a `deadline` row in the trace; it changes a column the Getting Started
> suite lesson teaches, so it needs its own test and a re-read of the records
> that quote a wall, not a mid-arm patch.
> *Reopens when* a page or an arm quotes a wall for a session that hit its
> deadline, or when the harness report is next changed.

- [ ] **Step 2: Check the entry is under 1,200 characters**, then
  `git commit BACKLOG.md -m "docs(backlog): one entry for the wall that under-reports a censored session"`.

### Task 10: Close the cycle

**Files:**
- Modify: `ROADMAP.md`, this plan
- Move: this plan to `docs/superpowers/plans/archive/`

- [ ] **Step 1: LC.25's Status cell** reads `complete 2026-10-25 — [plan](docs/superpowers/plans/archive/2026-10-25-lc25-lesson-openers.md).`
  followed by what shipped, that it was wording only, and the `npm test` total.

- [ ] **Step 2: `## Now`.** `**Active:**` names LC.18; `**Next:**` drops LC.25
  and keeps LC.19 behind its instrument.

- [ ] **Step 3: `## Result`** in this plan: date, the nine commits, the check
  that now holds, and what is still owed (LC.19's instrument).

- [ ] **Step 4: Archive.** Set `lifecycle: closed` and
  `git mv docs/superpowers/plans/2026-10-25-lc25-lesson-openers.md docs/superpowers/plans/archive/`.

- [ ] **Step 5: Reconcile and verify.** `git log --oneline e4b30ba..HEAD`,
  `node --test tests/docs-caps.test.mjs`, `npm test`, then commit
  `docs(lc25): close the cycle`.

## Risks

- **Prose that overclaims.** An opener is read before any badge, so a sentence
  that sounds like a finding on a null page is the failure mode. Each one is
  copied from what the page already says; the Interpretation's weakest-badge
  sentence is the test of whether it went too far.
- **A check that drifts from the template.** The rule lives in two places, the
  template prose and the test. The test's four assertions are the template's
  four clauses, and a future edit to one owes the other.
- **Seven commits, one file each.** Cheap to review, but a reviewer reading the
  branch needs the table above to see they are one change.

## Result

2026-10-25. Shipped: the two-sentence opening on the seven older lessons, one
commit each, and the shared check in `tests/learn-site.test.mjs` that holds the
rule for every lesson page. Nothing was measured, no badge moved, and no page's
evidence changed; the seven sentences are the ones in the table above, at 40–44
words.

The check was written first and failed on `lessons/baseline.md has no opening
paragraph`, then advanced page by page as each opener landed. It was committed
with the last page, so every commit on the branch is green. `npm test`
367/367, `docs-caps` 4/4, and `uv run zensical build` clean.

The two `BACKLOG.md` entries for the `wall` metric are now one. Owed elsewhere:
LC.19's suite-shaped instrument, in its row.
