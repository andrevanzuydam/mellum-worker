---
phase: L.1
cycle: 1
lifecycle: closed
---

# L.1 Learning Center skeleton implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Zensical site in `learn/` that builds locally and explains the
Learning Center itself (home, About pages, glossary, credits, three track
index pages, the six-step lesson template and the badge convention), with no
lessons yet.

**Architecture:** `zensical.toml` at the repo root points `docs_dir` at
`learn/`. Pages are plain Markdown that also render on GitHub. One Node test
checks the skeleton's structure and terms, so the suite guards it like the
doc caps.

**Tech Stack:** Zensical (run with `uvx zensical`), Markdown with YAML front
matter, Node's built-in test runner (`node --test`).

**Spec:** [Learning Center design](../specs/2026-10-20-learning-center-design.md).
Read it and `docs/sdd.md` before starting. The PR digest
([research](../research/2026-10-20-pr-digest.md)) is the worked example the
About pages point at.

## Global Constraints

- Terms: Learning Center, track, lesson, six-step template, Interpretation,
  badge. Pages under `learn/` never say "tutorial" or "case study".
- Tracks: `getting-started`, `paul`, `andre`, in that order in the nav.
- Six steps, exactly these `##` headings: `Problem`, `Eval case`,
  `Evidence of the problem`, `Solution`, `Evidence it worked`,
  `Interpretation`.
- Badges: `reference-run`, `cited`, `screen`, `conjecture`; on steps 1–5
  only; written as `**Badge:**` plus the name in inline code.
- Front matter keys: `title`, `track`, `position`, `prerequisites`,
  `authors`, `backends`.
- Credits: "a collaboration between Andre van Zuydam and Paul Everitt", and
  Tina4 with a link.
- No lesson pages, no runs, no public deploy (consent gate, spec section 9).
- Links to `docs/`, `ladder/` and code are GitHub URLs on `main`
  (`https://github.com/pauleveritt/mellum-worker/blob/main/...`).
- No npm `build`, `prepare`, `prepack` or `install` script (AGENTS.md).
- Every new test is seen failing before the pages that make it pass.

## File map

- Create `zensical.toml`: site name, `docs_dir`, `nav`, `exclude_docs`.
- Create `learn/index.md`, `learn/glossary.md`, `learn/credits.md`,
  `learn/lesson-template.md`.
- Create `learn/about/index.md`, `learn/about/how-to-read.md`,
  `learn/about/evidence.md`, `learn/about/contributing.md`.
- Create `learn/getting-started/index.md`, `learn/paul/index.md`,
  `learn/andre/index.md`.
- Create `tests/learn-site.test.mjs`.
- Modify `.gitignore` (add `site/`), `CHANGELOG.md` (`[Unreleased]`,
  Added), `README.md` (one line pointing at the Learning Center).

## Task 1: Site config, structure test and home

**Files:** create `tests/learn-site.test.mjs`, `zensical.toml`,
`learn/index.md`; modify `.gitignore`.

**Interfaces:**
- Produces: `PAGES`, the list of required pages, and the helper
  `page(path)` in `tests/learn-site.test.mjs`; Tasks 2 and 3 add their
  assertions to this file.

- [ ] **Step 1: Write the failing test.** It reads files only; no build.

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const page = (p) => readFileSync(resolve(ROOT, "learn", p), "utf8");
const PAGES = ["index.md"];

test("zensical.toml points docs_dir at learn/", () => {
	const toml = readFileSync(resolve(ROOT, "zensical.toml"), "utf8");
	assert.match(toml, /^docs_dir = "learn"$/m);
	assert.match(toml, /^site_name = "Andre\/Paul Learning Center"$/m);
});

test("every required page exists and is in the nav", () => {
	const toml = readFileSync(resolve(ROOT, "zensical.toml"), "utf8");
	for (const p of PAGES) {
		assert.ok(existsSync(resolve(ROOT, "learn", p)), `learn/${p} missing`);
		assert.ok(toml.includes(`"${p}"`), `learn/${p} not in nav`);
	}
});
```

- [ ] **Step 2: Run it and see it fail.**
  Run `node --test tests/learn-site.test.mjs`. Expected: FAIL, `ENOENT`
  on `zensical.toml`.

- [ ] **Step 3: Add `zensical.toml`.**

```toml
[project]
site_name = "Andre/Paul Learning Center"
site_description = "Small coding models, measured: problems, fixes, evidence."
repo_url = "https://github.com/pauleveritt/mellum-worker"
docs_dir = "learn"
site_dir = "site"
exclude_docs = "code/"
nav = [
  { "Home" = "index.md" },
]
```

  Add `site/` to `.gitignore`.

- [ ] **Step 4: Write `learn/index.md`.** Title "Andre/Paul Learning
  Center". Three short paragraphs: what the center teaches (running a small
  coding model locally behind Pi and fixing what goes wrong, with evidence);
  where to start (Getting started, then any findings lesson); how evidence
  is labelled (one sentence, link to `about/evidence.md`). Then a list of
  the three tracks, each linking its `index.md`.

- [ ] **Step 5: Run the test and see it pass.** Expected: 2 pass.

- [ ] **Step 6: Build.** Run `uvx zensical build`. Expected: exit
  0 and `site/index.html` exists. Fix any warning about a missing nav page
  by adding the page in its own task, not by removing the nav entry.

- [ ] **Step 7: Commit** `zensical.toml`, `.gitignore`, `learn/index.md`,
  `tests/learn-site.test.mjs` as "feat(learn): Zensical skeleton and home".

## Task 2: About the Learning Center

**Files:** create the four `learn/about/*.md` pages, `learn/glossary.md`,
`learn/credits.md`; modify `zensical.toml`, `tests/learn-site.test.mjs`.

**Interfaces:**
- Consumes: `PAGES` and `page()` from Task 1.
- Produces: the badge convention text in `learn/about/evidence.md`, which
  Task 3's template links to by the anchor `#badges`.

- [ ] **Step 1: Extend the test.** Add the six pages to `PAGES`, and add:

```js
test("credits name both authors and Tina4", () => {
	const c = page("credits.md");
	assert.match(c, /a collaboration between Andre van Zuydam and Paul Everitt/);
	assert.match(c, /\[Tina4\]\(https?:\/\//);
});

test("evidence page defines all four badges", () => {
	const e = page("about/evidence.md");
	for (const b of ["reference-run", "cited", "screen", "conjecture"])
		assert.ok(e.includes(`\`${b}\``), `badge ${b} missing`);
});
```

- [ ] **Step 2: Run it and see it fail.** Expected: FAIL, `learn/about/index.md missing`.

- [ ] **Step 3: Write `learn/about/index.md`, "What this is".** What the
  center teaches and for whom (spec sections 1–2); how it grew out of
  mellum-worker, its ladder and its recorded runs; that it is a
  collaboration between Andre and Paul (link `../credits.md`); what it is
  not (not the worker's manual: link the README on GitHub).

- [ ] **Step 4: Write `learn/about/how-to-read.md`, "How to read a
  lesson".** Tracks and their order; Getting started is fixed, findings
  lessons stand alone and list prerequisites; the six steps, one sentence
  each (spec section 5); what an Interpretation is and is not (the four
  rules); a worked walk through idea 1 of the PR digest, linked on GitHub,
  saying it is not yet a lesson.

- [ ] **Step 5: Write `learn/about/evidence.md`, "Evidence and badges".**
  A `## Badges` section with the spec's section 6 table; why each badge
  names its backend (Ollama numbers differ from oMLX); upgrading and
  downgrading a badge (always with a linked record, dated line under the
  Interpretation); why a `screen` is a lead and not a rate (link
  `docs/sdd.md` on GitHub, "Evals: screens first").

- [ ] **Step 6: Write `learn/about/contributing.md`, "Contributing a
  lesson".** An idea goes in a digest first, in six-step form; review checks
  every claim against its linked record; the consent rule (no lesson
  attributed to someone is published without their written yes); how to
  write an Interpretation within its weakest badge; copy
  `../lesson-template.md` to start.

- [ ] **Step 7: Write `learn/glossary.md`** with the spec's section 3
  terms, and **`learn/credits.md`**: the collaboration sentence verbatim,
  one line each on Andre's and Paul's work, Tina4 with a link to its site,
  and the Mellum model's authors (JetBrains).

- [ ] **Step 8: Add the nav.** In `zensical.toml`, after Home:

```toml
  { "About" = [
    "about/index.md", "about/how-to-read.md",
    "about/evidence.md", "about/contributing.md",
  ] },
  { "Glossary" = "glossary.md" },
  { "Credits" = "credits.md" },
```

- [ ] **Step 9: Run the test and build.** `node --test
  tests/learn-site.test.mjs` passes; `uvx zensical build` exits 0.

- [ ] **Step 10: Commit** as "feat(learn): About pages, glossary, credits".

## Task 3: Tracks and the lesson template

**Files:** create `learn/getting-started/index.md`, `learn/paul/index.md`,
`learn/andre/index.md`, `learn/lesson-template.md`; modify
`zensical.toml`, `tests/learn-site.test.mjs`, `CHANGELOG.md`, `README.md`.

**Interfaces:**
- Consumes: `PAGES`, `page()`; the `#badges` anchor from Task 2.

- [ ] **Step 1: Extend the test.** Add the four pages to `PAGES`, and add:

```js
const STEPS = ["Problem", "Eval case", "Evidence of the problem",
	"Solution", "Evidence it worked", "Interpretation"];

test("the lesson template has the six steps in order, badges on 1-5", () => {
	const t = page("lesson-template.md");
	const heads = [...t.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
	assert.deepEqual(heads, STEPS);
	const sections = t.split(/^## /m).slice(1);
	sections.forEach((s, i) =>
		assert.equal(/\*\*Badge:\*\*/.test(s), i < 5, `step ${i + 1} badge`));
});

test("learn/ never says tutorial or case study", () => {
	for (const p of PAGES)
		assert.doesNotMatch(page(p), /tutorial|case stud/i, p);
});
```

- [ ] **Step 2: Run it and see it fail.** Expected: FAIL,
  `learn/getting-started/index.md missing`.

- [ ] **Step 3: Write the three track index pages.** Each: one paragraph on
  the track, its order rule (fixed for Getting started, recommended for
  the findings tracks), and a "Lessons" list. Getting started lists lesson
  1 (base Pi on Ollama, phase L.2) and lesson 2 (mini harness, phase L.3)
  as "coming". Paul's says lessons come from M.1–M.7 and the A-series in
  L.4. Andre's says lessons come from the PR digest in L.5, after Andre
  agrees; it lists no idea titles yet.

- [ ] **Step 4: Write `learn/lesson-template.md`.** The front matter block
  from spec section 5 inside a fenced `yaml` block (so the template page
  itself has none), then the six `##` headings, each with one line saying
  what goes there; steps 1–5 start with `**Badge:** \`conjecture\`` and a
  link to `about/evidence.md#badges`; Interpretation lists its four rules.

- [ ] **Step 5: Add the nav** after Home and before About:

```toml
  { "Getting started" = ["getting-started/index.md"] },
  { "Paul's findings" = ["paul/index.md"] },
  { "Andre's findings" = ["andre/index.md"] },
```

  and add `{ "Lesson template" = "lesson-template.md" }` after Glossary.

- [ ] **Step 6: Run the test and build.** Both pass; open
  `uvx zensical serve` and check the nav order: Home, three tracks, About,
  Glossary, Lesson template, Credits.

- [ ] **Step 7: Changelog and README.** Under `[Unreleased]` → `Added`:
  "A Learning Center site skeleton in `learn/` (Zensical): what the center
  is, how to read a lesson, the evidence badges and how to contribute; no
  lessons yet. Build it with `uvx zensical build`." In the README, one line
  under the docs links pointing at `learn/index.md`.

- [ ] **Step 8: Full checks and commit.** `node --test
  tests/docs-caps.test.mjs` and `npm test` pass. Commit as "feat(learn):
  track pages and the six-step lesson template".

## Review Focus

1. The About pages and the spec agree: badge table, Interpretation rules,
   consent gate.
2. No page claims a result: every lesson is "coming".
3. The template page has the six headings and only steps 1–5 carry badges.


## Result

L.1 shipped the Learning Center skeleton: `zensical.toml`, home page, four About pages, glossary, credits, three track index pages, the six-step lesson template, and `tests/learn-site.test.mjs`. The site builds with `uvx zensical build` with no issues. No lessons were written, no runs were made, and no measured claims were made. All 326 tests pass, including the new learn-site tests.
## Closing L.1

Per `docs/sdd.md`: update L.1's Status cell and `## Now` (Next: L.2),
write `## Result` here with what shipped and that nothing was measured,
set `lifecycle: closed`, move this plan to `plans/archive/`, run both test
commands, and reconcile `[Unreleased]`.
