# Learning Center design: an Andre/Paul site on small-model evidence

Date: 2026-10-20. Decided with Paul in chat (Superpowers brainstorming,
approved section by section). Inputs: Paul's Discord pitch to Andre van
Zuydam, the [PR digest](../research/2026-10-20-pr-digest.md), and these
choices: Ollama with re-run evidence, lessons published with badges, a
`learn/` directory, a mini harness first, a closing Interpretation on every
lesson, and the terms center, track and lesson. Phases L.1–L.5 in
[`ROADMAP.md`](../../../ROADMAP.md) carry it out; the first plan is
[L.1](../plans/2026-10-20-l1-learning-center-skeleton.md).

Not a measured change: the worker, prompt, extensions, guards and ladder
are untouched by this design. Evidence for lessons comes from runs that
later phases make and record in `docs/ladder/`.

## 1. Goals

- Walk a learner from base Pi on a local model to evidence-backed fixes for
  the problems small coding models have.
- Tell every finding the same way, so a learner can see what was measured
  and what was not.
- Turn this repo's history (Paul's phases M.1–M.7 and the A-series
  ablations) and Andre's PRs into lessons without overstating either.
- Credit the work as a collaboration and keep it portable: a later move to
  Satyrn Education should be a copy of `learn/`, not a rewrite.

Non-goals: a reference manual for the worker (the README stays that), new
measured claims made by the site itself, PyCharm content (backlog), and
publishing SDD records as site pages.

## 2. Audience

Developers who want to run a small open coding model locally behind an
agent harness, on macOS, Linux or Windows. They know a terminal and Python
or Node. They do not need Apple Silicon: the Getting started track runs on
Ollama.

## 3. Glossary

These terms are fixed, and the site, this spec and the roadmap use no other
names for these units.

- **Learning Center**: the whole Zensical site under `learn/`.
- **Track**: a group of lessons with a recommended order. There are three:
  Getting started, Paul's findings, Andre's findings.
- **Lesson**: one page that teaches one thing. Getting started lessons
  build on each other; a findings lesson stands alone and lists its
  prerequisites.
- **Six-step template**: Problem → Eval case → Evidence of the problem →
  Solution → Evidence it worked → Interpretation. Every findings lesson uses
  it.
- **Interpretation**: the closing narrative of a lesson: what the evidence
  means, how far its badges let you trust it, and what is still open.
- **Badge**: a label on each of steps 1–5 saying what the step rests on:
  `reference-run`, `cited`, `screen` or `conjecture` (section 6).
- **Reference run**: a preregistered ladder run on Ollama, recorded in
  `docs/ladder/`, made for a lesson.
- **Mini harness**: the small eval harness learners build in Getting
  started lesson 2, kept in `learn/code/`. It is not the ladder.

## 4. Tracks

### Getting started (fixed order)

1. **Base Pi on Ollama.** Install Ollama and the Mellum GGUF named in
   [`docs/backends/ollama.md`](../../backends/ollama.md), chat with the
   model, then connect Pi through a provider template and get an answer.
   Phase L.2, which also does the Ollama port checklist (GGUF, Modelfile,
   tool-call check, provider templates).
2. **A mini harness and a suite.** Build a small harness in `learn/code/`
   that runs Pi on a task and scores it; write an easy, a medium and a hard
   task; watch base Pi pass easy and struggle on hard; read the run's
   telemetry (turns, tool calls, tool errors, the final reply) to see why.
   Phase L.3, which also records an Ollama reference ladder run.

Each lesson lists what it produces, so lesson 2 can start from lesson 1's
result.

### Paul's findings

Lessons from M.1–M.7 and the A-series ablations, one idea per lesson.
Candidate ideas are mined from the phase rows and research notes in a
digest like the PR digest, written in phase L.4 before any lesson. The
track index gives a recommended order; every lesson lists Getting started
as its prerequisite plus any findings lesson it builds on.

### Andre's findings

Lessons from the ten ideas in the [PR digest](../research/2026-10-20-pr-digest.md),
phase L.5. Proposed order, for Andre to review: idea 9 (a clean negative
result), then 1, 2, 6, 3, 4, 5, 7, 8, 10. Gated on Andre's consent
(section 9).

## 5. Lesson template

### Front matter

Every lesson page starts with:

```yaml
---
title: The worker decides when it is done
track: andre            # getting-started | paul | andre
position: 2             # recommended order within the track
prerequisites: [getting-started/harness]
authors: [Andre van Zuydam, Paul Everitt]
backends: [omlx, mlx-lm] # where the badged evidence ran; ollama once re-run
---
```

`prerequisites` lists page paths without `.md`. `authors` is who did the
work the lesson tells, not who wrote the page. Getting started lessons use
the same front matter and need not follow the six steps.

### The six steps

Each findings lesson has six `##` sections in this order, with these
names:

1. **Problem**: what a small model does wrong, in one paragraph a learner
   can recognise from their own runs.
2. **Eval case**: the rung or task that reproduces it, and how it is
   scored, with a link to the code.
3. **Evidence of the problem**: the runs that show it, with n and backend.
4. **Solution**: the change, with a link to the commit or file.
5. **Evidence it worked**: the runs that show the change helped, or did
   not.
6. **Interpretation**: a short narrative, no badge.

Steps 1–5 each open with one badge. A negative result keeps the template:
step 5 shows that the change did not help.

### Interpretation rules

- It names the weakest badge among steps 1–5 that its conclusion relies
  on, and states nothing stronger than that badge supports.
- It says which backend the evidence came from when that differs from the
  learner's (Ollama).
- It ends with what is still open: the run that would upgrade the weakest
  badge, or the question the evidence cannot answer.
- It is commentary: no new numbers appear in it.

## 6. Evidence badges

| badge | means | needs |
| --- | --- | --- |
| `reference-run` | a preregistered run on Ollama, made for this lesson | a record in `docs/ladder/`, a preregistration, raw evidence in a `research-*` release |
| `cited` | an existing record on oMLX or mlx-lm | a record in `docs/ladder/` or a research note on `main` |
| `screen` | a few targeted runs or one observation | a research note, or a PR note or commit message cited by name |
| `conjecture` | no run behind it | reasoning, design, unit tests only |

For steps 1, 2 and 4 the badge is the strongest evidence the statement
rests on; for steps 3 and 5 it is the strength of the evidence itself.

**Upgrading a badge.** Each lesson whose steps 3 or 5 are below
`reference-run` gets a roadmap item for the run. When the run lands, the
lesson's badge, numbers and Interpretation change in the same commit as
the record, with a dated line under the Interpretation saying what
changed. A run that weakens a claim downgrades the badge the same way. A
badge never changes without a linked record.

A badge is the first line of its section, written as **Badge:** followed by
the badge name in inline code, so it renders the same on GitHub and in
Zensical. The convention is defined once in `learn/about/evidence.md`;
styling it is later work and needs no change to lessons.

## 7. Site layout

```text
zensical.toml                 # [project] site_name, docs_dir = "learn", nav
learn/
  index.md                    # home: what the center is, where to start
  about/                      # the center explained (section 8)
  glossary.md
  credits.md
  lesson-template.md          # the six-step template, copyable
  getting-started/index.md    # + lesson pages from L.2, L.3
  paul/index.md               # + lessons from L.4
  andre/index.md              # + lessons from L.5
  code/                       # mini harness (L.3), not published as pages
```

- `zensical.toml` sits at the repo root with `docs_dir = "learn"`
  (Zensical cannot use `.`). `site/` is the build output and is ignored by
  Git.
- `learn/code/` is excluded from pages with `exclude_docs`; lessons show
  its files with snippets.
- Lessons link to `docs/ladder/` records, research notes and code through
  GitHub URLs on `main`, so SDD records stay unpublished and still render
  on GitHub (`docs/sdd.md`, "Docs are a presentation layer").
- Navigation is by track; each track's `index.md` lists its lessons in the
  recommended order with each lesson's weakest badge.

## 8. About the Learning Center

Four pages in `learn/about/` explain the center itself. They are written in
L.1, before any lesson, and kept current as the center grows.

- **`index.md`, What this is**: what the center teaches, who it is for, how
  it grew out of mellum-worker and the ladder, and that it is a
  collaboration between Andre van Zuydam and Paul Everitt.
- **`how-to-read.md`, How to read a lesson**: tracks and their order,
  standalone lessons and prerequisites, the six steps, what an
  Interpretation is and is not, and a worked walk through one lesson.
- **`evidence.md`, Evidence and badges**: the four badges, what each needs,
  why a backend is named, how a badge is upgraded or downgraded, and why a
  `screen` is a lead and not a rate.
- **`contributing.md`, Contributing a lesson**: how a lesson is proposed
  (an idea in a digest first), reviewed (claims checked against linked
  records), and published; the consent rule for attributed lessons; how to
  write an Interpretation that stays within its badges.

## 9. Attribution and consent

- `learn/credits.md` says the Learning Center is "a collaboration between
  Andre van Zuydam and Paul Everitt" and mentions Tina4, Andre's project,
  whose developer skill supplied the `mellum-dev` coding principles
  (PR #1, `dd3a7c2`), with a link.
- Every lesson's `authors` names whose work it tells.
- **Consent gate.** No lesson attributed to Andre is published, and the site
  is not deployed publicly, until Andre says yes in writing (a PR comment or
  issue is enough; it is linked from L.5's Status cell). Until then the
  site builds locally only. L.1–L.4 do not depend on his PRs.
- A lesson that cites an unmerged PR links the PR and the commit, not a
  branch, so the citation stays stable.

## 10. Phases

| phase | ships |
| --- | --- |
| L.1 | `zensical.toml`, home, About pages, glossary, credits, track index pages, lesson template, badge convention; local build |
| L.2 | Getting started lesson 1 and the Ollama port |
| L.3 | Getting started lesson 2, the mini harness, an Ollama reference ladder run |
| L.4 | A digest of Paul's phases, then Paul's findings lessons |
| L.5 | Andre's findings lessons, gated on consent |

M.11 and M.12 stay on the roadmap. PR #1 is a candidate implementation of
M.11; L.5 tells its story and does not decide M.11.

## 11. Risks

- **Ollama numbers differ from oMLX.** Every badge names its backend; a
  `cited` oMLX number is never presented as what the learner will see.
- **Interpretation overreaches.** The rules in section 5 apply, and review
  checks each Interpretation against its weakest badge.
- **Re-runs pile up.** Badges, not gating: lessons publish with the badges
  they have, and runs are roadmap items.
- **Andre declines or changes scope.** L.5 waits or is dropped; nothing
  else changes.
- **The mini harness drifts from the ladder.** It is a teaching tool;
  findings lessons cite the ladder only.
- **Zensical is young.** Pages are plain Markdown with front matter, so a
  move to another generator or to Satyrn Education is a copy.

## Excluded

Building the site (L.1), any run, any lesson text, merging Andre's PRs,
PyCharm content and the Satyrn Education refactor (both backlog), and any
change to the worker, prompt, guards or ladder.
