# Roadmap: mellum-worker

Read [`README.md`](README.md) for what ships and [`docs/sdd.md`](docs/sdd.md)
for how work is recorded. Deferred work lives in [`BACKLOG.md`](BACKLOG.md).
One phase at a time; tangents go to the backlog, never into the current phase.

## Now

**Active:** none; LC.1–LC.4 are closed. LC.6 is Next.
**Shipped:** v0.1.8 (2026-10-13): A21 measured the README's lighter `## Mellum` section; see [`CHANGELOG.md`](CHANGELOG.md).
**Next:** LC.6, the first Paul findings lesson, in the [LC phases](#learning-center-lc).
**After:** LC.7–LC.15, then LC.5 sets up Andre's track. The M series is closed ([archive](ROADMAP-M.md)) and its last two phases are backlogged.
**Parked:** OpenCode, Ollama, execution bounds, versioned assessments, the mediated test and one worker are [backlog entries](BACKLOG.md) with reopen conditions.

## Phases

The M series closed on 2026-10-20 and is archived in
[`ROADMAP-M.md`](ROADMAP-M.md); its last two phases moved to the backlog.
The Learning Center is the active programme.

### Learning Center (LC)

`LC` marks a workstream that ships something else and does not take an `M`
number. LC.1–LC.3C are closed; LC.4 onward are intent, and their
[spec](docs/superpowers/specs/2026-10-20-learning-center-design.md) is the
authority.

| Phase | Ships | Excludes | Status |
| --- | --- | --- | --- |
| **LC.1** | Site skeleton: `zensical.toml` at the repo root with `docs_dir = "learn"`, the home page, four `learn/about/` pages (what the center is, how to read a lesson, evidence badges, contributing), a glossary, credits for Andre and Paul with a Tina4 mention, three track index pages, the six-step lesson template with badges, a Validation step and an Interpretation, and a passing local `zensical build`. | Writing lessons; llama.cpp or ladder runs; Andre-attributed content; any public deploy; publishing the SDD docs. | complete 2026-10-20 — [plan](docs/superpowers/plans/archive/2026-10-20-l1-learning-center-skeleton.md), archived under its old `L.1` id; the phase was re-prefixed `LC.` on 2026-10-20 and step 5 was renamed Validation with the spec. No measured claims. Shipped in [Unreleased]. |
| **LC.2** | Getting started, lesson 1: the learner clones the repo and installs `uv`, and the root `pyproject.toml` fetches Python; `scripts/backend.py` replaces the Justfile and reads `[tool.mellum]` as the one settings source; `learn/code/profile/models.json` is generated from it; llama.cpp pulls `Q4_K_M` through `-hf`; base Pi answers through the private profile, leaving `~/.pi` alone; `learn/project/` documents how the repo works for maintainers. | The harness, suite and telemetry (LC.3); Ollama, which stays a backlog option for a non-Apple machine; Andre's material. | complete 2026-10-20 — [plan](docs/superpowers/plans/archive/2026-10-20-lc2-base-pi-on-llamacpp.md). Live smoke on the M5 Max: `Q4_K_M` served with `n_ctx` 50176, `chat` replied in 94 tokens, base Pi through the private profile answered "Hello"; `npm test` 334/334. The lesson is [Base Pi on llama.cpp](learn/getting-started/base-pi-on-llamacpp.md); every backend claim stays `screen` until LC.3 reruns the ladder ([llamacpp.md](docs/backends/llamacpp.md)). Shipped in [Unreleased]. |
| **LC.3** | Getting started, lesson 2: `learn/code/harness.py`, which copies a task into a fresh run directory, hands it to a child `pi` through the private profile, copies the hidden tests in after the run and scores them; `learn/code/record-pi.mjs` writes the run's trace; one easy fixture and the score line. | The suite, telemetry and grading (LC.3A); the ladder run (LC.3B); model or prompt changes. | complete 2026-10-20 — [plan](docs/superpowers/plans/archive/2026-10-20-lc3-mini-harness.md). Live run through the llama.cpp server: `easy: PASS`, a 21-row trace (4 requests, 3 tool calls, 0 errors), the model's `fizz.py` passing the hidden tests; `npm test` 337/337. The lesson is [Make a mini harness](learn/getting-started/harness.md). Shipped in [Unreleased]. |
| **LC.3A** | Getting started, lesson 3: the medium and hard fixtures, `suite easy|medium|hard`, the telemetry walkthrough over the trace, and validation grading through `uvx` `ruff`, `pyrefly` and one complexity tool with fixed thresholds. | Model or prompt changes; the ladder as the learner's harness; more than one complexity tool. | complete 2026-10-20 — [plan](docs/superpowers/plans/archive/2026-10-20-lc3a-suite-telemetry-grading.md). Live `suite all --grade`: 3/3 passed, with ruff's `I001` on the medium and hard import blocks and `pyrefly`/`complexipy` clean; `npm test` 345/345. The lesson is [A suite and the telemetry](learn/getting-started/suite.md). Shipped in [Unreleased]. |
| **LC.3B** | The ladder takes a backend: `--provider`, `--base-url` and `--model`, and skips oMLX's admin API when the provider is not `omlx`; then a rung-1 smoke drives llama.cpp end to end. | Any measured claim; changing the ladder's scoring; the reference run (LC.3C). | complete 2026-10-20 — [plan](docs/superpowers/plans/archive/2026-10-20-lc3b-ladder-backend.md). Rung-1 smoke on llama.cpp: PASS, 7 requests, 0 tool errors, 8.8 s, `llama-server` 0.7.0 recorded; `ladder/` pytest 183/183, `npm test` 346/346. No `docs/ladder/` record and no claim. Shipped in [Unreleased]. |
| **LC.3C** | The preregistered llama.cpp reference run: arms, n, reading and decision rule fixed first, then rungs 1–5 recorded in `docs/ladder/` with raw evidence in a `research-*` release. | Promoting a llama.cpp number to an oMLX claim; changing the worker. | complete 2026-10-20 — [plan](docs/superpowers/plans/archive/2026-10-20-lc3c-reference-run.md), [record](docs/ladder/reference-llamacpp-rungs1-5/README.md). Preregistered 15 runs, all valid: 14/15 passed; rung 4 repeat 3 stopped on `length` with an empty reply. Raw evidence owed as `research-2026-10-20`. No promotion; lessons cite it as `reference-run`. |
| **LC.4** | Paul's findings digest: one six-step entry per lesson mined from M.1–M.7 and the A-series in a research note, the track index, and one LC row per lesson it identifies. | Writing a lesson; new measurements; advice not backed by a record. | complete 2026-10-20 — [plan](docs/superpowers/plans/archive/2026-10-20-lc4-paul-digest.md), [digest](docs/superpowers/research/2026-10-20-paul-findings-digest.md), [track index](learn/paul/index.md). Ten lessons, rows LC.6–LC.15; no lesson text, no run. |
| **LC.5** | Andre's findings setup: the track index from the ten PR-digest ideas and a record of Andre's consent, adding one LC row per idea he approves. | Writing or publishing an Andre-attributed lesson before his written yes; merging his PRs. | not started — the consent gate is the hard blocker; `learn/andre/` can ship empty. |
| **LC.6** | Lesson 1, "The primary agent is the wrong worker": six steps in `learn/paul/`, steps 1–5 badged, an Interpretation naming its weakest badge, and a review against the cited records. | New measurements; advice not backed by a record; editing `docs/ladder/`. | not started — see the [digest](docs/superpowers/research/2026-10-20-paul-findings-digest.md) and [track index](learn/paul/index.md). |
| **LC.7** | Lesson 2, "A short prompt, not a procedure": six steps in `learn/paul/`, steps 1–5 badged, an Interpretation naming its weakest badge, and a review against the cited records. | New measurements; advice not backed by a record; editing `docs/ladder/`. | not started — see the [digest](docs/superpowers/research/2026-10-20-paul-findings-digest.md) and [track index](learn/paul/index.md). |
| **LC.8** | Lesson 3, "Thinking is working memory": six steps in `learn/paul/`, steps 1–5 badged, an Interpretation naming its weakest badge, and a review against the cited records. | New measurements; advice not backed by a record; editing `docs/ladder/`. | not started — see the [digest](docs/superpowers/research/2026-10-20-paul-findings-digest.md) and [track index](learn/paul/index.md). |
| **LC.9** | Lesson 4, "Guards for empty turns and loops": six steps in `learn/paul/`, steps 1–5 badged, an Interpretation naming its weakest badge, and a review against the cited records. | New measurements; advice not backed by a record; editing `docs/ladder/`. | not started — see the [digest](docs/superpowers/research/2026-10-20-paul-findings-digest.md) and [track index](learn/paul/index.md). |
| **LC.10** | Lesson 5, "Project facts": six steps in `learn/paul/`, steps 1–5 badged, an Interpretation naming its weakest badge, and a review against the cited records. | New measurements; advice not backed by a record; editing `docs/ladder/`. | not started — see the [digest](docs/superpowers/research/2026-10-20-paul-findings-digest.md) and [track index](learn/paul/index.md). |
| **LC.11** | Lesson 6, "Write only the files you list": six steps in `learn/paul/`, steps 1–5 badged, an Interpretation naming its weakest badge, and a review against the cited records. | New measurements; advice not backed by a record; editing `docs/ladder/`. | not started — see the [digest](docs/superpowers/research/2026-10-20-paul-findings-digest.md) and [track index](learn/paul/index.md). |
| **LC.12** | Lesson 7, "Who holds the loop": six steps in `learn/paul/`, steps 1–5 badged, an Interpretation naming its weakest badge, and a review against the cited records. | New measurements; advice not backed by a record; editing `docs/ladder/`. | not started — see the [digest](docs/superpowers/research/2026-10-20-paul-findings-digest.md) and [track index](learn/paul/index.md). |
| **LC.13** | Lesson 8, "A prose brief stops at its first reply": six steps in `learn/paul/`, steps 1–5 badged, an Interpretation naming its weakest badge, and a review against the cited records. | New measurements; advice not backed by a record; editing `docs/ladder/`. | not started — see the [digest](docs/superpowers/research/2026-10-20-paul-findings-digest.md) and [track index](learn/paul/index.md). |
| **LC.14** | Lesson 9, "The intercom block is a prefill tax": six steps in `learn/paul/`, steps 1–5 badged, an Interpretation naming its weakest badge, and a review against the cited records. | New measurements; advice not backed by a record; editing `docs/ladder/`. | not started — see the [digest](docs/superpowers/research/2026-10-20-paul-findings-digest.md) and [track index](learn/paul/index.md). |
| **LC.15** | Lesson 10, "One spec file per phase": six steps in `learn/paul/`, steps 1–5 badged, an Interpretation naming its weakest badge, and a review against the cited records. | New measurements; advice not backed by a record; editing `docs/ladder/`. | not started — see the [digest](docs/superpowers/research/2026-10-20-paul-findings-digest.md) and [track index](learn/paul/index.md). |

Each findings lesson is its own phase and cycle, numbered in track order from
LC.6: one page, one plan, one badge set, one close. LC.4 and LC.5 write the
digest or index and add those rows; neither writes a lesson.

## Gates

A phase closes under [the SDD closing rules](docs/sdd.md#closing-a-phase):
its plan records the result and is archived, roadmap/backlog state is current,
the suite and document caps pass, and claims match the evidence they cite.
Releases separately require matching tags, package and README versions, and
a changelog section.
