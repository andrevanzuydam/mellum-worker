# Roadmap: mellum-worker

Read [`README.md`](README.md) for what ships and [`docs/sdd.md`](docs/sdd.md)
for how work is recorded. Deferred work lives in [`BACKLOG.md`](BACKLOG.md).
One phase at a time; tangents go to the backlog, never into the current phase.

## Now

**Active:** none; LC.1 is closed. LC.2 is Next.
**Shipped:** v0.1.8 (2026-10-13): A21 measured the README's lighter `## Mellum` section; see [`CHANGELOG.md`](CHANGELOG.md).
**Next:** LC.2, Getting started lesson 1: llama.cpp and base Pi chat, in the [LC phases](#learning-center-lc).
**After:** nothing is scheduled beyond LC.5. The M series is closed ([archive](ROADMAP-M.md)) and its last two phases are backlogged.
**Parked:** OpenCode, Ollama, execution bounds, versioned assessments, the mediated test and one worker are [backlog entries](BACKLOG.md) with reopen conditions.

## Phases

The M series closed on 2026-10-20 and is archived in
[`ROADMAP-M.md`](ROADMAP-M.md); its last two phases moved to the backlog.
The Learning Center is the active programme.

### Learning Center (LC)

`LC` marks a workstream that ships something else and does not take an `M`
number. LC.1 is closed; LC.2–LC.5 are intent, and their
[spec](docs/superpowers/specs/2026-10-20-learning-center-design.md) is the
authority.

| Phase | Ships | Excludes | Status |
| --- | --- | --- | --- |
| **LC.1** | Site skeleton: `zensical.toml` at the repo root with `docs_dir = "learn"`, the home page, four `learn/about/` pages (what the center is, how to read a lesson, evidence badges, contributing), a glossary, credits for Andre and Paul with a Tina4 mention, three track index pages, the six-step lesson template with badges, a Validation step and an Interpretation, and a passing local `zensical build`. | Writing lessons; llama.cpp or ladder runs; Andre-attributed content; any public deploy; publishing the SDD docs. | complete 2026-10-20 — [plan](docs/superpowers/plans/archive/2026-10-20-l1-learning-center-skeleton.md), archived under its old `L.1` id; the phase was re-prefixed `LC.` on 2026-10-20 and step 5 was renamed Validation with the spec. No measured claims. Shipped in [Unreleased]. |
| **LC.2** | Getting started, lesson 1: the learner clones the repo and installs `uv`, and the root `pyproject.toml` fetches Python; `scripts/backend.py` replaces the Justfile and reads `[tool.mellum]` as the one settings source; `learn/code/profile/models.json` is generated from it; llama.cpp pulls `Q4_K_M` through `-hf`; base Pi answers through the private profile, leaving `~/.pi` alone; `learn/project/` documents how the repo works for maintainers. | The harness, suite and telemetry (LC.3); Ollama, which stays a backlog option for a non-Apple machine; Andre's material. | not started — dated note 2026-10-20: switched from the plan's Ollama choice to llama.cpp, which runs here but is only smoke-tested ([llamacpp.md](docs/backends/llamacpp.md)), so every claim it makes is `screen` until LC.3 reruns it. The existing Getting started page is a placeholder; lesson 1 replaces it. The Justfile is retired before either reaches a release. |
| **LC.3** | Getting started, lessons 2 and 3: `learn/code/harness.py`, which copies each task to a fresh directory, runs it through a child `pi` with the private profile, scores it with the task's tests and keeps its telemetry; the easy/medium/hard suite and a telemetry walkthrough; validation grading through `uvx` `ruff`, `pyrefly` and one complexity tool with fixed thresholds; a llama.cpp reference ladder run recorded in `docs/ladder/`. | Model or prompt changes; the ladder as the learner's harness; more than one complexity tool. | not started — the reference run upgrades that lesson's badges from `screen` to `reference-run`; the complexity tool is chosen here, and `radon` (6.0.1) and `complexipy` (8.1.0) both install under `uvx`. |
| **LC.4** | Paul's findings track: lessons drawn from M.1–M.7 and the A-series ablations, each evidence step badged, each ending in an unbadged Interpretation. | New measurements; turning records into advice; Andre-attributed content. | not started — each lesson cites an existing record in `docs/ladder/` or `docs/superpowers/research/`. |
| **LC.5** | Andre's findings track: lessons from the ten PR-digest ideas, six steps each, published only after Andre's explicit yes. | Publishing an Andre-attributed lesson without his approval; merging his PRs. | not started — the consent gate is a hard blocker; `learn/andre/` can ship empty. |

## Gates

A phase closes under [the SDD closing rules](docs/sdd.md#closing-a-phase):
its plan records the result and is archived, roadmap/backlog state is current,
the suite and document caps pass, and claims match the evidence they cite.
Releases separately require matching tags, package and README versions, and
a changelog section.
