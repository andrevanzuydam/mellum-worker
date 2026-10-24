# Changelog

Versions match git tags; pin one in both install lines.

## [Unreleased]

### Fixed

- The flow examiner is taught two more general testing-discipline rules, after a correct
  implementation failed brittle gates: (1) every request whose redirect is asserted needs
  `follow_redirects=False` (the examiner had applied it to some POSTs but not others, so TestClient
  followed the redirect and a correct handler failed), and (2) assert RELATIVE deltas, not absolute
  totals, because the tests share one in-memory store that earlier tests have already mutated. Both
  rules are stated generally, with no suite-specific routes, fields or values — the examiner still
  derives every assertion from the spec. The examiner prompt's remaining illustrative examples were
  scrubbed of suite-specific names for the same reason.
- The flow examiner is a thinking model whose reasoning cannot be capped, and on a complex phase it
  needs more than 16384 tokens just to finish thinking — so at that cap it emitted an EMPTY test
  (`finish_reason=length`, no content) and no gate froze. The hard "Archive & Audit" phase stalled
  on exactly this. The examiner's `max_tokens` is raised to 32000 (measured: it then finishes
  thinking and emits the full test), and `bestPytest` now salvages the test from any assistant
  block when the examiner ends on verifying chatter rather than the test itself.
- The flow now judges a phase on the frozen acceptance gate (`tests/test_gate_phase_*.py`) alone,
  not on the coder's own scratch tests. A brittle coder test — the hard "Resolve and Reopen"
  phase's list-equality order check, polluted by shared in-memory state — was failing a build that
  passed the authoritative gate. The gate is the definition of DONE; the coder's extra tests no
  longer gate a correct, gate-passing solution.
- The examiner could freeze a self-contradictory absence check: `assert "Resolve" not in html`
  while the same test required the status "Resolved" present ("Resolve" is a substring of
  "Resolved"), so no correct app could pass — the hard "Resolve and Reopen" phase looped on it.
  The examiner is now told to target the specific control (its form `action=` URL or the exact
  button) when checking an action is gone, never a bare substring of a word the page shows.
- A dangling markdown fence in the examiner's reply (a trailing ` ``` ` with no opening fence, or
  an opening ` ```python ` with no close) survived into the frozen Python gate, so
  `phase_gate_ok`'s `compile()` rejected an otherwise-correct gate and the phase looped to
  exhaustion. The hard suite's "Resolve and Reopen" phase died this way — a lone fence on the gate's
  last line. `asCode` now strips any lone fence line as a safety net, so a fence can never reach the
  gate file.
- The flow examiner wrote redirect acceptance tests that a correct handler could never pass:
  `starlette`'s `TestClient` follows redirects by default, so a plain `client.post(...)` returns
  the final `200` page and `assert status_code == 303` fails a correct `303` handler. The medium
  suite's "Add Complaint" phase looped to exhaustion on this — the app was right, the frozen gate
  was unpassable. The examiner is now told to pass `follow_redirects=False` on the redirecting
  request before asserting the status and `Location` header.
- Removing Pi's base prompt (the `--system-prompt` fix) also removed the structure that kept the
  planner concise, so it rambled ~635s on a trivial plan and timed the fork out. Two fixes, since
  the model's reasoning can't be toggled off (neither `reasoning_effort` nor `enable_thinking` is
  honored — verified): (1) a project operating guide (`BASE_GUIDE`) is prepended to every role —
  focus, brevity ("be decisive, do not deliberate"), tool-use, output-only — replacing Pi's
  structure in our own voice, generic so it contradicts no role; (2) per-phase `max_tokens` — the
  planner and reviewers capped below examine/code (8192) — small enough to bound a runaway, large enough not to truncate a thinking model (2048 emptied the plan),
  examine and code kept generous (16384). `max_tokens` is the only lever that bounds reasoning here.
- Flow phase sub-agents appended their role prompt to Pi's base coding-agent prompt
  (`--append-system-prompt`), leaving Pi's generic "thorough coding agent" framing on top of
  every tightly-scoped role — diluting them and pushing the examiner to over-assert. They now
  REPLACE it (`--system-prompt`), matching the orchestrator and the direct worker; only the
  role prompt governs each phase.
- The flow examiner invented exact strings the spec never gave (e.g. a viewport
  `initial-scale=1.0`, exact nav markup), producing brittle gates that a correct
  implementation can't match — even the home page failed. It now asserts exact values ONLY
  where the spec is verbatim, and asserts the requirement (a viewport meta exists, a link to
  the named route is present) — not an invented string — for loosely-described requirements.
- The flow examiner under-specified identity, so a multi-phase run could pass its own gate
  while the hidden grader failed. Medium went visible=PASS / hidden=FAIL because the worker
  gave `Complaint` no stable `id` field (resolve/reopen worked by list index), and the
  examiner never asserted identity. `examine` now requires, for any phase that acts on a
  specific record (resolve/reopen/update/delete/fetch by id), a stable explicit id FIELD on
  the model — distinct per record, addressed by id, unchanged across the mutation, no
  reordering — closing the visible/hidden gap on that class of phase.
- The flow orchestrator could loop a phase to the deadline: a rung-6 run re-ran the
  (expensive) `examine` tool 5×, `review_code` 3×, and never called `test`, burning the whole
  1200s budget on a solution it already had. `examine` now runs **once per phase** — once its
  gate is frozen, re-calls are blocked with a pointer to `code()`/`test()` — and a per-phase
  tool-call cap (`PHASE_CALL_CAP`, 16) stops the orchestrator thrashing, while always leaving
  `test` (the only exit) callable.

### Added

- A `flow` mode for the ladder (`run_ladder --mode flow`): runs the spec-driven flow
  orchestrator (mellum-flow.ts — plan/review/examine/code/test, the examiner writing the
  acceptance test from the spec) on a rung's fixture and scores it with the rung's own hidden
  grader, so the spec-driven paradigm is measured on the same rungs as the direct baseline.
  It cleared rung 6 (AgentClinic phase 1), which both models fail in direct mode because the
  fixture ships no visible test — the examiner supplies the missing target.
- The flow harness now keeps its bookkeeping (`TASK.md`, `TODO.md`, `REVIEW.md`, the frozen
  gate) under a single `plan/` folder instead of the workspace root, so it never mixes with
  the solution tree; the ladder's flow mode moves `plan/` out of the workspace before grading
  so it cannot trip the AgentClinic write-list (`app.py, models.py, templates/, tests/`).

- A workspace-confinement guard in `mellum-guards.ts` (`confineToWorkspace`, on by default):
  it blocks a `bash` tree-walk (`grep -r`/`-R`, `find`, `rg`, `ls -R`) that targets an
  absolute path outside the worker's working folder, while allowing relative searches and
  paths under it. A worker had run `grep -rl pattern /Users /var /tmp …`, which crawls the
  whole machine and hangs the run for minutes; the guard stops that and tells the worker to
  search within its workspace.

### Fixed

- The flow harness counted a phase as passed whenever pytest passed — even when the
  examiner had produced no acceptance test for that phase. A fork whose examiner output
  was dropped or malformed then inherited only the earlier phases' gate and passed
  trivially, and best-of-N (promote the first fork to pass) actively selected that
  weakest fork. On a hard run this meant phases 3–7 reported PASS while only phases 1–2
  were built. A fork now counts as passing phase N only when it froze a real acceptance
  test for N: `.mellum_gate/phase_<n>.py` must exist, compile as Python (an examiner that
  emitted an HTML/template blob is rejected) and define at least one test. The examiner
  also validates its own output, retries once on a non-pytest reply, and refuses to
  freeze a junk gate; `asCode` now prefers a ```python block over any other fenced block.
- `run_top` crashed a whole best-of-N run when reaping a child process group raised
  `PermissionError` (EPERM) — a pid recycled into a group the process no longer owns. The
  reap now ignores both `ProcessLookupError` and `PermissionError`.

### Changed

- The flow harness's self-written acceptance tests now **accumulate across phases**
  instead of being overwritten each phase. The examiner freezes each phase's test
  under `.mellum_gate/phase_<n>.py`, and both the `test` tool and the runner restore
  the WHOLE frozen set into `tests/` (as `test_gate_phase_*.py`) before scoring — so
  every earlier phase is re-run and a later phase can no longer pass by silently
  regressing an earlier one. The examiner prompt is stricter too: it enumerates every
  requirement for its phase and must assert the negative and edge cases (missing or
  invalid input, empty, unauthorized, not-found, duplicates, exact error status and
  message), not only the happy path; the coder is pointed at the cumulative gate and
  told earlier phases must keep passing. This closes the visible-pass / hidden-grader
  gap that came from each phase only being checked while it was the current one. The
  worker still writes its own tests from the spec — nothing is injected or hand-authored.

### Added

- Fix the orchestrator "stall": the phase task and reviewer feedback now flow
  through files (`TASK.md`, `TODO.md`, `REVIEW.md`) and every phase tool is called
  with NO arguments. oMLX's tool-call parser drops a tool call whose JSON arguments
  are a large multi-line string, so passing the whole task as `plan(task=…)` was
  silently dropped and the agent emitted nothing — the cause of every stall on a
  non-trivial task (easy, with a 33-char task, always parsed; larger phases did
  not). Argument-free tool calls always parse.

- `flow_run` best-of-N concurrency (`--concurrency N`): run N attempts per phase
  in parallel on the batched oMLX server (sampling temperatures spread 0.3→1.2 for
  diverse tries), forking the workspace per attempt and promoting the first that
  passes. Turns the server's concurrent throughput into wall-clock speed and beats
  the per-phase variance of a single sequential try.

- A `mellum-knowledge` extension (`extensions/mellum-knowledge.ts`) and
  `learn/code/docs_lookup.py`: a `lookup` tool grounded in the INSTALLED venv
  packages. `docs_lookup.py` builds a BM25 index over the venv's package source
  — every class and function with its signature (default values included) and
  docstring — and returns the top matches for a query; the extension exposes it
  as a tool the coder calls when unsure of an exact API, or when a failure is
  API-shaped (`TooManyRedirects` -> FastAPI's `RedirectResponse` defaults to
  307, so a POST redirect needs `status_code=303`). It reflects the exact
  installed versions — the only way past the model's training cutoff, since the
  ladder runs on Python 3.15. The harness builds the index on the initial run
  and caches it; it grounds on library docs a developer would have, never the
  task solution or the hidden grader. The index auto-rebuilds when the installed
  packages change (a newly-installed dependency becomes searchable), and the
  tool takes a `rebuild` flag to force a re-index on demand. Offline,
  dependency-free (pure-Python BM25). Loaded on the coder.

- Smart decomposition in `flow_run`: split a task on Phase/Step headers at ANY
  level, then any markdown header, so a multi-level spec (the hard suite's
  `# Phase 5`–`7` under `## Phase 1`–`4`) breaks into its real phases instead of
  one wall. Each phase carries a small, constant forward context — a
  model-determined **north star** (a one-line orient call over the phase
  titles), a running summary of what is already built, and the last phase's
  context — so a decomposed step stays grounded without the model ever seeing
  the whole task.

- A `mellum-flow` extension (`extensions/mellum-flow.ts`) and its runner
  (`learn/code/flow_run.py`): the **workflow as tools the model calls**, not an
  external loop. It registers the phases as tools — `plan`, `review_plan`,
  `code`, `review_code`, `test` — and the top agent orchestrates them from a
  workflow prompt, iterating on REDO / test failure. Each phase (except `test`)
  runs as an isolated `pi` sub-agent with its own system prompt and tool
  allowlist over one shared workspace: only the coder writes or runs commands,
  the reviewers are read-only, and the planner's reply is saved as `TODO.md` by
  the tool, so a plan is always persisted. Light prerequisite guards require a
  `TODO.md` before `review_plan`/`code`. For a multi-phase task the runner
  drives one phase at a time — this model cannot bound its own reasoning
  (`supportsReasoningEffort: false`), so a small per-phase task keeps each call
  finishing — with a retry wrapper that re-invokes a stalled orchestrator from
  the shared workspace, and a live feed of each sub-agent's steps. It reuses the
  feed and scoring helpers from `learn/code/loop_run.py`, the external-loop
  runner. Measured: the easy and medium suites pass (visible and hidden grader),
  fully model-driven.

- A `mellum-nonblock` extension (`extensions/mellum-nonblock.ts`): a bash
  command that starts a server (uvicorn, `app.py`, `flask run`, a dev server …)
  blocks forever and would hang a workflow stage until its timeout. The
  extension rewrites such a command to run threaded in the background, captures
  its output and feeds it back, so the stage keeps moving. Loaded only on the
  coder — the one phase that runs commands.

- A `mellum-loop` orchestration core (`extensions/mellum-loop.ts`): the state
  machine for a variable-extension **workflow** loop with two review gates —
  **planning → plan_review → coding → code_review → testing**. A too-complicated
  plan routes back to planning (stabilise the plan early); a failing code review
  or a broken test routes back to **coding** (iterate the code, don't re-plan
  every failure); a repeated broken test runs a **rubber-duck** step (reason it
  out, amend `TODO.md`) before coding again; all bounded by a round budget.
  Each workflow is a separate Pi invocation (`pi -p --no-extensions -e … --thinking
  <level>`) with its own minimal extension set and thinking budget — only coding
  carries the guards, planning/review think light — so the orchestrator replaces
  the plan and verify gates (fewer extensions, order enforced by the runner, not
  a block the model can wait out). Pure core; the Pi-invoking runner builds on it.

- A `mellum-contract` extension (`extensions/mellum-contract.ts`): Tier-1
  dynamic mediation. It derives a structural acceptance test straight from the
  task spec — the app module and every route the spec names — and writes a
  pytest the `mellum-ncm` gate can enforce (`NCM_TEST`), with no per-task
  authoring. It checks the app boots and that each named route is registered
  (path params normalised). It catches the early failures (nothing built, a
  missing route, the wrong module); deep contracts (exact aggregation keys, a
  migration schema) are Tier-2 (an examiner model), not structurally inferable.

- A `mellum-surgical` extension (`extensions/mellum-surgical.ts`): block a
  `write` that would clobber an existing file. On a write onto a file that
  already exists it measures churn (the fraction of lines changed — the clobber
  signal) and growth (a duplicated copy) against the current content and blocks
  a regeneration, steering the worker to `edit` the targeted change; a write to
  a new file is always allowed. Churn is the detector; growth stays generous so
  a legitimate addition (a new route or field) is never mistaken for a rewrite.
  Caps tune with `MELLUM_SURGICAL`; load with `-e extensions/mellum-surgical.ts`.
  Measured incidence on the current model is low (Pi's `edit` anchors reliably),
  so this is a cheap safety net, not a hot path.

- A `mellum-plan` extension (`extensions/mellum-plan.ts`): plan before you code —
  gather information, write a `TODO.md` of every step to satisfy the whole spec,
  follow it checking each step off, and on a test failure amend the `TODO.md` and
  go round again until green ("fail to plan, plan to fail"). It gates on the
  concrete `TODO.md` **artifact**, not a flaky text turn: the first source
  `edit`/`write` is blocked until a non-empty `TODO.md` exists (writing the
  `TODO.md` itself is always allowed; reads/greps/shell never gated); once it
  exists, the worker is free to implement and follow it. Applies even to simple
  tasks — a plan curbs flailing. BOUNDED: it fails open after `max` blocks
  (default 2) so it can never deadlock the build. Pairs with `mellum-ncm` for the
  re-run-until-green pressure. Load with `-e extensions/mellum-plan.ts`; tune with
  `MELLUM_PLAN` (e.g. `{"max":1}`, or `{"max":0}` to disable).

- A `mellum-quality` extension (`extensions/mellum-quality.ts`): at
  `agent_before_settle` it runs `ruff --select F,E9` over the worker's own
  changes and, when a real error remains — a shadowed redefinition (F811), an
  undefined name (F821), an unused import (F401) or a syntax error — hands it
  back with one bounded nudge to fix before finishing. Real-error classes only,
  never style, so a working solution is never failed on cosmetics; it degrades
  to silence when ruff cannot run. Load it with `-e extensions/mellum-quality.ts`
  and tune it with `MELLUM_QUALITY` (JSON, e.g. `{"max":1,"select":"F"}`).

- A `zensical-glossary` build for `learn/glossary.md`: the page now has
  `###` entries for `screen`, `nudge`, `empty-final nudge`, `no-nudge`,
  `Baseline Worker`, `Baseline Pi`, `arm`, `ablation`, the telemetry columns
  and the extension terms. The extension links each term on its first prose occurrence and
  supplies hover definitions; the build uses `uvx --with zensical-glossary
  zensical build` in CI and in the project checks.

- The suite baseline lesson, `learn/lessons/baseline.md`: Baseline Pi versus
  the Baseline Worker on easy, medium and hard, n = 3, from the 45-session
  llama.cpp run, with the same telemetry as the template.

- Added `learn/code/clinic` and `learn/code/clinic.ps1` wrappers for the
  worker-extension lesson. Each sets the profile, session, model, isolation
  flags and extension, and takes the task as its only argument, so the Bash
  and PowerShell examples are one line.

- The hard eval suite, `learn/code/suites/hard`: the whole AgentClinic build
  from phase 1, with a user-story roadmap, seven phases (archive/audit, a
  database report, and a visits report with filtering, grouping and sorting)
  and four schema migrations generated with `sqlite-utils`. Hidden graders
  cover phases 1–7 and the migrations; `qualify --suite hard` passes.

- The medium eval suite, `learn/code/suites/medium`: AgentClinic's four phases
  as four requests, with a user-story roadmap, hidden phase graders 1–4,
  expected test IDs, a canary, and known-good/known-broken fixtures.
  `qualify --suite medium` passes.

- The first eval suite, `learn/code/suites/easy`: AgentClinic's mission, tech
  stack and hinted four-phase roadmap, one prompt for phase 1, a hidden
  per-phase grader with expected test IDs, and known-good/known-broken
  fixtures. `harness.py qualify --suite easy` proves the grader both ways.

- A follow-up digest for Andre's PRs #3 and #4: ten potential lessons
  (goalposts, the mediated test, v9, mediation as a completeness gate, rungs
  10–12, context, rethink, documents and images, live control, next-concept
  verify), each badged, with support items listed separately.
- The Lessons index is one recommended list of twenty, each with a one-line
  description and an italic author tag, *(Paul)* or *(Andre)*.
- A GitHub Actions workflow builds the Zensical site on pull requests and
  deploys it to Pages from `main`.

- Paul's finding "A short prompt, not a procedure": prompt v5 at 643
  characters, with the A2/A3 removals and the A4 line that came back after a
  14/15, on cited oMLX records.

- The first findings lesson, "The primary agent is the wrong worker": the
  primary-agent baselines (8/15 bare, 10/15 with the operator profile) against
  the bounded worker (15/15), with the prefill and wall costs, on cited oMLX
  records and an Interpretation that says so.

- Getting started lesson 5, "The worker extension": what a Pi extension is,
  `/mellum` as the vehicle, and a live session on the ditch's prompts. The
  worker produces a package whose tests include `assert True` and a CLI of
  seeded demo data, so the vehicle is not yet the remedy. The extension also
  falls back to the session's Mellum model when the oMLX one is absent, which
  is what makes it usable on llama.cpp.
- Getting started lesson 2, "The ditch": one open-ended AgentClinic session
  whose final report claims a working app and a passing test run; checking
  both shows four failing tests and a missing date filter. The harness gains
  `--deadline` so a session like it cannot run the host out of memory.

- The lesson harness runs a session: a task may hold one prompt or several
  (`prompts/`), all sent in one Pi session in one workspace and scored once at
  the finish. `--repeat N` repeats the session, every score line states its n,
  and summaries count sessions rather than rates.

- Paul's findings track is planned as ten lessons, each its own phase, from a
  digest of M.1–M.7 and the A-series; the track index lists them in a
  recommended order, from the primary-agent baseline to the one-file roadmap
  screen, and each lesson stands alone.

- A llama.cpp reference record for ladder rungs 1–5, preregistered first:
  14/15 passed, with the one failure (rung 4, repeat 3 hit the token cap with
  no final reply) reported as it happened. It is what lessons cite as a
  `reference-run`; rungs 6–9 are unrun.

- The ladder takes `--provider`, `--base-url`, `--model` and
  `--context-window`, records the backend it measured, and skips oMLX's admin
  profile when the provider is not `omlx`; a rung-1 smoke drives llama.cpp
  end to end. No reference run yet.

- Getting started lesson 3, "A suite and the telemetry": `suite all --grade`
  runs the easy, medium and hard fixtures, prints each run's turns, tool calls
  and tool errors, and grades the model's files with `ruff`, `pyrefly` and
  `complexipy` beside the score.

- Getting started lesson 2, "Make a mini harness": `learn/code/harness.py`
  runs a task in a fresh directory through a child Pi with a private profile,
  copies the task's tests in only after it exits, and prints one score line;
  `learn/code/record-pi.mjs` records each run's requests, tool calls and
  errors for the next lesson.

- A Project section in `learn/` for maintainers: what the repository
  contains, where its records live, the `uv`/`pyproject.toml` toolchain, the
  backend commands, the checks and the release steps.

- Getting started lesson 1 walks a machine with no Python from `uv` to a
  first base-Pi answer on llama.cpp: the root `pyproject.toml` fetches the
  interpreter, `scripts/backend.py` starts the server and chats, and a
  private profile keeps the learner's own `~/.pi` out of the run.

- A Learning Center site skeleton in `learn/` (Zensical): what the center is, how to read a lesson, the evidence badges and how to contribute; no lessons yet. Build it with `uvx zensical build`.

- `uv run scripts/backend.py serve|start|status|stop|chat` runs Mellum 2.1
  through llama.cpp on Apple Silicon without a daemon: Q4_K_M at 50k context,
  with the settings read from `[tool.mellum]` in the root `pyproject.toml`.
  It is a second backend beside oMLX, and nothing is ladder-measured on it
  yet; the Justfile it replaces never reached a release.

- [docs/backends/llamacpp.md](docs/backends/llamacpp.md) records that backend:
  the flags, the measured numbers (8.38 GB peak and 207 tok/s generation at
  50k context on Q4_K_M), why this model's sliding-window layers make 50k
  context nearly free, and what is still untested, so a 16 GB claim is not
  mistaken for a measurement.

- Ladder records for a rung 9 screen that ran A21's two changes alone: the
  AgentClinic phase 4 id miss follows the one-file roadmap (5 of 6 runs,
  against 1 of 6 with one spec file per phase). Exploratory, n = 3 per arm.

### Changed

- The eval harness runs suites easiest-first (`easy`, `medium`, `hard`) rather
  than alphabetical, so a slow hard suite never blocks the quicker ones;
  unknown suites keep alphabetical order after the known tiers.

- `mellum-ncm` gains a whole-suite verify mode: set `NCM_ALL=1` to run the
  entire visible test suite at settle and refuse "done" until it is green — the
  agnostic developer-loop gate (the worker isn't done until it has run the whole
  thing and seen it pass), beside the existing named acceptance test (`NCM_TEST`,
  mediation). Adds a `verifyCommand` helper; the gate is inert unless `NCM_TEST`
  or `NCM_ALL` is set.

- The README builds the site with `uvx --with zensical-glossary zensical
  build`; a bare `zensical build` now fails because the glossary extension is
  required.

- Basic Remedies is dropped as a lesson module after its 45-session screen:
  the prompt and loop were null, the nudge was a lead, and hard floored every
  arm. The shipped full worker is now the **Baseline Worker**, with **Baseline
  Pi** as its comparison; the baseline lesson and research record carry the
  result.

- The harness lesson states the settings a run sends to llama.cpp: server
  context 50000, and Pi’s sampled `temperature 1.0`, `top_p 0.95`, `top_k 20`,
  `max_tokens 16384`. These are the out-of-the-box values, not the greedy
  reference block.

- The lesson template now asks for a short “What the telemetry shows” narrative
  under the before/after table and a minimal in-page code sample of the
  remedy under Solution; a link alone is not enough.

- Lesson 1 now points to The ditch as the next lesson, gives Linux and Windows
  install and PowerShell profile guidance instead of treating the macOS
  commands as universal, and drops the internal phase id from its ending.

- The harness lesson now explains `n=1` and how to run more sessions with
  `--repeat`, including the `3/3 sessions passed` summary. It also points at
  `learn/code/suites/easy/` instead of the retired task directory.

- The worker-extension lesson now states the model split plainly: the main
  agent is the larger model Pi started with, and `/mellum` temporarily
  switches the session to Mellum, then restores the main model with a
  handoff. The README says the same.

- Hard's schema changes are now generated migrations: a `migrations.py` in
  the `agentclinic` set, applied with `sqlite-utils migrate data.db` and
  recorded in `_sqlite_migrations`, so a re-run is a no-op. The ad-hoc
  `schema_version` prompt is gone.

- Lesson 4 is rewritten for eval suites: what a suite is (base docs,
  prompts, hidden grader, expected IDs, fixtures, canary), how easy, medium
  and hard differ, how qualification works, the grading and static gates,
  out-of-repo runs and the canary, and how to read the trace. It now spells
  out what hard adds after medium's four phases: archive/audit, the tickets
  report, the visits report, and the four migrations.

- The harness runs **eval suites**, not tasks: `learn/code/suites/`, `run --suite`,
  with per-suite prompts, hidden graders and expected test IDs. Runs live under
  the system temp directory, outside the repo, and a canary in a suite's grader
  marks a session `CONTAMINATED` if the model touches it. Static analysis is
  ruff `F,E9` and complexipy as gates, pyrefly as an advisory.

- The site has two tracks instead of three: **Getting started** and
  **Lessons**. Paul's findings and Andre's findings are one Lessons track
  under `learn/lessons/`, each lesson still standalone with its own authors
  and prerequisites; the old `paul/` and `andre/` index pages are gone.

- The suite lesson says plainly that one session is one observation: the
  harness runs a task once by default, and a rate comes from the ladder, not
  from a handful of sessions.

- The README now links all three Getting started lessons and the harness
  command, and the track index and "How to read a lesson" say what each
  lesson produces, so a reader can tell a lesson worked.

- The M series is closed and archived in `ROADMAP-M.md`. The mediated test and
  the one-worker rename are backlog entries now, the README's future work
  points at them instead of at phases, and the Learning Center is the only
  active programme.

- The Learning Center teaches llama.cpp rather than Ollama, because that is
  what runs here; Ollama stays the backlogged port for a machine without
  Apple Silicon, and the skeleton's pages and badge definitions say so.

- The six-step lesson template's fifth step is Validation — the test suite
  plus `ruff`, `pyrefly` and one complexity tool — rather than a prose claim
  that the change worked, and the phase series is `LC`, not `L`.

- The README's backend line now names llama.cpp as smoke-tested rather than
  measured, alongside the Ollama port's requirements.

- The README now opens with the idea the package serves, domain engineering
  (you write specs and tests, Mellum makes the test command exit 0), names
  the mediated test as the next guardrail and how to do it by hand today,
  unmeasured, and says the OpenCode port is ported and unmeasured with its
  measurement on the backlog. Future work points at the backlog — the mediated
  test and one worker, in place of M.8–M.10, M.3 and M.4.

- A bare `--mode direct` ladder run now sends the worker prompt in place of
  Pi's (`--prompt-mode replace`), which is what the shipped agent file does;
  `--prompt-mode append` is still there for comparing with phases 0–2.

### Fixed

- The lesson-suite grader (`learn/code/harness.py`) no longer lints the
  workspace's `.venv`. ruff's `--exclude` REPLACES its built-in excludes (which
  include `.venv`), so `grade()` was linting installed packages and failing
  every working solution on `F403` inside PyYAML. It now uses `--extend-exclude`,
  keeping ruff's default `.venv`/`__pycache__` exclusions and linting only the
  worker's own code.

- The Lessons sidebar now lists the two completed findings lessons instead of
  only the index; a test requires every published lesson page to be in the
  nav.

### Fixed

- Fenced code blocks render again: adding the glossary extension had replaced
  Zensical’s default `pymdownx.superfences`; it is now enabled explicitly.

### Removed

- The OpenCode port: `opencode/plugin.js`, the OpenCode templates and provider
  fragment, the setup skill's OpenCode provider phase, the `--host opencode`
  check, the package's `main` and OpenCode keyword, and their tests and
  fixtures. The package is Pi-only; the measured OpenCode rows stay as
  history.
- The pi-subagents Worker: its agent template, the setup skill's worker
  phase, the intercom option, the `kind: "worker"` run-record writer and the
  `learn`/`last` readers, their fixtures and tests, and the ladder's
  `delegated` mode. Old record files on disk are untouched; the code stops
  writing and reading them.
- The ladder's rejected research modes and hooks: `--mode chunked` and
  `--mode brief` with `ladder/ladder/briefs/` (A15/A16, not adopted),
  `--strip-thinking` (A12, reverted) and `--budget-hook` (A13, inert), and
  the `--harness` flag, which had one value and was never read. The records
  that used them keep their launch lines with a dated note; the code last
  exists at `44e1b0b`. `rescore` no longer backfills `baseline_lines` or
  `thinking_reentries`, which no record lacks.

- Mellum Mode's undocumented `MELLUM_MODE_PROVIDER` and `MELLUM_MODE_MODEL`
  overrides, and the `MELLUM_MODE_DEBUG` file writer. Mode runs the one
  measured model entry; `/mellum check` says when the provider entry differs.

## [0.1.8] - 2026-10-13

### Added

- The ladder's AgentClinic rungs take `--facts-section light` (the README's
  `## Mellum` bullets, no `Write only:` list) and `--roadmap one-file` (the
  four phase specs as one `specs/roadmap.md`, asked for as "Implement Phase
  N of specs/roadmap.md"), recorded in `run.json`, for measuring A21.

### Changed

- The README's lighter `## Mellum` section (`Test command:` plus `Do not:`
  naming the bends, no `Write only:`) is now measured: ladder phase A21
  passed 9/12 AgentClinic runs with no writes outside the layout, the same
  as A19's section rerun the same day. Ladder records A21 and A21 control.

### Fixed

- Ladder runs now stop any process still running in the run's workspace
  (a server Mellum started with `&` outlives Pi at the deadline) before the
  workspace is staged, and record them as `leftover_processes` in `run.json`.
  In M.7 such servers held ports 8000–8003 for later runs.

- Back-to-back `/mellum` one-shots recorded an empty task from the second
  run on: the previous run's off-marker lands after the next prompt, and
  the record looked only just before the on-marker. Mellum always got the
  task; only the run record (and `/mellum last`'s Task row) lost it.

## [0.1.7] - 2026-10-12

### Added

- `/mellum last` shows the newest Mellum run at or under the current
  directory, Mode or Worker, as a Markdown table: time and time to first write, turns, tool
  calls and errors, commands, files, tokens, facts, server match, guards and
  the final reply. It reads the run records with no model call, so a short
  follow-up question to your main model replaces a long telemetry prompt.
  `node scripts/mellum.mjs last [--file <jsonl>] [--json]` prints the same
  from a terminal.

- Mode and Worker run records now count tool calls by tool name
  (`toolCalls`), tool results that errored from any tool (`toolErrors`), and
  the seconds before the first edit or write (`firstWriteSeconds`), so a run
  shows how long Mellum explored before writing. Older records lack them.

### Changed

- Published two Pi 1.1.0 ladder telemetry smoke records with reconstruction
  notes and hashed raw evidence: Mode and Worker passed the existing rung-1
  checks. These validate instrumentation, without changing measured defaults.

- Ladder traces now correlate agent instances, requests and tool executions,
  retaining provider chunks and settlement/abort evidence. Runner records
  distinguish exit, signal and deadline; partial traces are flagged without
  changing task scores or everyday Mode/Worker run records.

- The ladder accepts `--pi-executable` for isolated Pi research and records
  the selected runtime and fixture environment. Failed fixture preparation
  now stops before a model request; delegated children use that runtime too.

- Aligned the SDD and roadmap rules with ds4-engine: short current-work
  pointers, dated corrections, explicit phase closure, and exploratory
  screens followed by preregistered runs when deciding a change or claim.
  Phase closure no longer requires a release tag.

### Fixed

- Chunked ladder runs now report exit and settlement for the last launched
  process, so a later timeout cannot inherit an earlier step's success.
  Launch argv also describes a process that actually started.

## [0.1.6] - 2026-10-11

### Added

- Pi Worker runs now write run records to `~/.pi/agent/mellum-worker-runs.jsonl`
  (`MELLUM_WORKER_RUNS` sets the path, `0` or empty turns it off, like
  `MELLUM_MODE_RUNS`), which `/mellum learn`
  reads. The guards extension records one line per finished run; no guard
  decision changes. The README, recipe and setup skill describe both
  record files; OpenCode runs are recorded with M.3.

### Changed

- README and setup phase 8: keep each `## Mellum` bullet on one line (Mode
  drops continuation lines and flattens nested bullets); add `pythonpath =
  ["."]` under `[tool.pytest.ini_options]` when tests import root modules,
  which phase 8 now offers; and a note that Mellum as your main Pi model
  gets none of the package's help, with how to start Pi so `python` and
  `pytest` are on PATH if you do.

## [0.1.5] - 2026-10-11

### Fixed

- The suggested `## Mellum` line no longer says "add files at the project
  root", which contradicts projects that keep `app.py` at the root. The
  README, the setup skill and `/mellum learn` now name the bends instead:
  `Do not: install packages or add dependencies; add __init__.py,
  conftest.py, pytest.ini or setup.cfg files`.

## [0.1.4] - 2026-10-11

### Added

- `/mellum check` in Pi Mode: checks that oMLX answers and lists the
  model, that the server settings no request can undo match the measured
  profile (context window, TurboQuant, thinking budget off, no tool-result
  cap, thinking not forced off, and sampling 1 / 0.95 / 20 when the server
  forces its own), and that your provider entry matches the template,
  failing on a different `maxTokens` or sampling value since those are what
  each request sends. Server values a request overrides (`max_tokens`,
  thinking, penalties) show as info. It only reads; a settings fix is
  printed as the `PUT` to run yourself.
- `node <package dir>/scripts/mellum.mjs check --host pi|opencode [--json]`:
  the same check from the terminal, for OpenCode and Pi Worker; exits 1 on
  any fail.
- Each `/mellum` activation reads the server's model settings (one second
  at most) and warns in one line when one of those binding values differs
  from the measured profile, since other clients of the
  same model can change them. Silent when the server cannot be read.
- `/mellum learn [n]` in Pi Mode: reads the last n run records (default
  10) for the current directory, names what went wrong (guessed test
  command, bent project, false success, long runs, servers, settings
  drift, announced-but-not-taken steps) and suggests `## Mellum` lines. It
  adds only the missing lines to `AGENTS.md`, and only after you answer
  yes; an existing line with another value is shown as a conflict, never
  rewritten, and the section never goes past the 600-character facts cap.
- `node <package dir>/scripts/mellum.mjs learn [--n 10] [--file <jsonl>] [--json]`:
  the same report from the terminal (run it from the project), for OpenCode
  and Pi Worker; it only prints.
- The setup skill's last step runs `scripts/mellum.mjs check` for your host
  and shows its output, so a wrong server setting shows up before the first
  task. `docs/recipe.md` gains a section on the run record, the seven
  `learn` patterns and the check.
- README: a What helped section after the results: telling Mellum the
  test command made most of the difference on the AgentClinic rungs, with
  the A18–A20 numbers in one table and their caveats.
- The run record gains `server` (`match`, and the differing settings), so
  a run on drifted settings can be told apart later; `match` is null when
  the settings could not be read.

### Changed

- The suggested `## Mellum` section no longer leads with a `Write only:` file
  list, which few projects keep: the README and the setup skill show a
  `Test command:` and a `Do not:` line (install packages, add files at the
  project root, weaken tests), and `/mellum learn` turns the bends it sees
  into `Do not:` values instead of a `Write only:` list. `Write only:` still
  works for a strict boundary. The lighter section is not yet measured.
- The expected oMLX values live in `templates/omlx-model-settings.json`,
  split into server-only values (context window, TurboQuant; a test ties
  the context window to the ladder's baseline profile) and the values each
  request overrides (`max_tokens` 16,384, forced thinking, penalties), which
  the setup skill's step 3 still writes for clients that send none. The
  README's Model settings table says which values your provider entry sends
  per request and which only the server sets.
- README: Use it explains Model settings, Check your setup, Learn from your
  runs (with an example report) and Project facts as one flow, with the
  commands for Pi Mode, the terminal, OpenCode and Pi Worker.
- README: a Future work section lists what is on the roadmap, in order,
  with links to ROADMAP.md and BACKLOG.md.
- README: about 40% shorter; same install lines, numbers and links.
- README: says the 6-bit weights are MLX weights, for Apple Silicon and
  served by oMLX, so nobody downloads them for another runtime.
- README: says `check --host pi` covers Pi Mode and Pi Worker and
  `--host opencode` covers OpenCode, and that Pi Worker and OpenCode runs
  write no records until M.7B (`learn` finds 0 runs there today). Its
  `learn` example is now real output on a test fixture.
- `learn` treats `Do not:` as a list: values your `AGENTS.md` already has
  (split on `;`, any case) are left out and the rest go in one new bullet,
  instead of printing a conflict for a line that only needed adding to.
- `learn` shows only the lines it would add to `AGENTS.md` (text and
  `--json` `suggestion`), and no Suggested block when it would add none, so
  the report no longer suggests a line it then reports as kept. A conflict
  on a label other than `Test command:` reads "runs suggest:", not "runs
  passed with:".

### Fixed

- Setup step 3 now also sets `enable_thinking` true, the thinking budget
  off and no tool-result cap. With `forced_ct_kwargs` forcing
  `enable_thinking`, a false value would turn thinking off for every client,
  and a server thinking budget or tool-result cap binds every client too.
- The README now states the cap the measured Mode and Worker runs used:
  `max_tokens` 16,384 with thinking on, verified in the A10, A17 and A19
  traces, which oMLX honours over the server profile's 4,096; only the
  direct-mode research phases ran at 4,096. The recipe and oMLX guide say
  the same, and note the two server settings that beat a request
  (`forced_ct_kwargs`, `force_sampling`). The planned "test 16,384 against
  4,096" run is withdrawn: 16,384 is what was measured.
- `learn` no longer stops on a hand-edited run record of the wrong shape
  (a `null` command, a numeric `endedAt`, `server.diffs` not a list): the
  bad entries or fields are dropped and the rest of the record still counts.
- `/mellum learn` reads `AGENTS.md` again after you answer yes and writes
  nothing if it changed in a way that alters the lines to add, so an edit
  made while it asked is never overwritten.
- `learn`'s `Write only:` no longer lists `/` or `../` for files written
  outside the project, and the report says "1 run", not "1 runs".
- `scripts/mellum.mjs learn --file` with no path exits 2 with the usage
  line instead of quietly reading the default records.

## [0.1.3] - 2026-10-10

### Fixed

- `/mellum <task>` under `pi -p` (and `pi --mode json`) returned at once,
  Pi disposed the runtime mid-run ("This extension ctx is stale"), and no
  run record was written. It now waits for the run, switches back, and
  writes the record before Pi exits. When the host has no UI, warnings and
  errors (the model is missing, Mode did not start in time) go to stderr
  instead of vanishing.

### Added

- `ladder/`: rungs 6 to 9, the four AgentClinic phases, to measure
  whether Mellum can build a small project from its specs (looser phase
  specs with a `## Mellum` section in each fixture's `AGENTS.md`, hidden
  behaviour tests, and reference solutions for the earlier phases). A rung passes
  only when the project's own tests, hidden behaviour tests and the
  existing-tests check all pass (no existing test is removed or edited;
  added tests are allowed, in old or new files) and nothing was written
  outside the `AGENTS.md` write-list; the write-list result is reported on its own as
  `outside_write_list`, and a workspace whose `git status` fails does not
  pass. The runner gains `--mode-facts {on,off}`
  (`off` sets `MELLUM_MODE_FACTS=0`) and `--strip-facts-section`, and
  `run.json` records both. `python -m ladder.rescore --existing-tests-kept
  <phase dir>` rescores a recorded phase under that rule from its retained
  workspaces, as `check_rescored` beside the original `check`.
- Run record schema 2: `schema`, `version`, `promptVersion`, `host`
  (`tui`, `rpc`, `print`, `json`), `activation` (`one-shot`, `on`,
  `headless`), `taskNamesTestCommand`, `edits`, `filesMissingAtEnd`,
  `commands[].mutates`, `finalTurn` (`stopReason`, `hadText`,
  `hadToolCall`), `nudges` and `guardBlocks`. All schema 1 fields are
  kept; lines written before this change have no `schema` field (schema
  1), so one run file can mix both. `commands[].mutates` comes from `commandMutatesFiles`, a heuristic
  for shell commands that change files (`rm`, `mv`, redirects, `sed -i`,
  `git checkout`, `pip install`, virtualenvs).
- `ladder/`: the five-rung ladder that measures this checkout (runner,
  scorer, fixtures and ablation prompts), moved in from the research
  repo. `npm test` also runs its two JS hook tests; its Python tests run
  with `cd ladder && uv run python -m pytest`. It measures what ships: it
  renders the Worker agent from this checkout's own template, loads Mode
  once, and each `run.json` records which checkout ran (`worker_version`,
  `worker_git`). The Mode RPC probe (`ladder/ladder/probe_mode_rpc.py`)
  writes its run records under its scratch directory, not to your
  `~/.pi/agent/mellum-mode-runs.jsonl`.
- `docs/ladder/`: the phase records (A0 to A17 and the earlier phases:
  READMEs, tables, run records, final answers and briefs), moved in from
  the research repo. Raw traces, stdout and diffs are archived per phase
  as `research-2026-10-09` release assets, with their hashes in
  `docs/ladder/PROVENANCE.md`; they are not tracked.
  `uv run python -m ladder.archive_raw` (in `ladder/`) builds those
  tarballs. The first run from this checkout is the `smoke-m6-one-repo`
  record.
- `docs/ladder/ablation-a18-agentclinic-facts-off/`: the A18 record, the
  baseline for the project-facts work. Mellum Mode on the AgentClinic
  rungs 6 to 9 with facts off, three repeats each: 1 of 12 passes under the
  added-tests-allowed rule (0 of 12 under the strict one), median 50
  requests. Its raw files are archived under the same release tag.
- `docs/ladder/ablation-a19-facts-on/` and
  `ablation-a20-facts-fallback-only/`: the records that decide the
  project-facts work. With the `## Mellum` section forwarded, Mode passes
  9 of 12 AgentClinic runs (A18: 1) at a median of 26 requests (A18: 50)
  and 15 of 15 on rungs 1 to 5, so the ship rule holds; with only the
  `python -m pytest` fallback it passes 7 of 12. Write-up in
  `docs/superpowers/research/2026-10-09-m7-project-facts.md`.
- Mellum Mode forwards project facts: the bullets of a `## Mellum` section
  in the project's `AGENTS.md` (600 characters at most; over that Mode
  warns and ignores the section), and, when no test command is given and
  `pyproject.toml` mentions pytest, `Test command: uv run --offline python
  -m pytest -q`. They are appended to every user message Mode sends,
  interactive or headless, so the prompt's "a command named in the task is
  the command" rule sees the project's own test command; the session's
  stored messages are unchanged. `MELLUM_MODE_FACTS=0` turns it off. The
  run record gains `facts` (`source`, `testCommand`, `chars`), the
  handoff summary line names the source, and the session shows
  `[mellum-mode on] facts: <source>` when a span starts. Shipped on the
  ladder's verdict: on the four AgentClinic rungs (12 runs each), 9 of 12
  pass with the section against 1 of 12 with facts off (rescored under
  the added-tests rule) and 7 of 12 with the fallback alone; median
  requests 26 against 50; no run writes outside the write-list (facts off:
  8 of 12); rungs 1 to 5 pass 15 of 15.
- README and `docs/recipe.md` §4b: how to write the `## Mellum` section,
  what it fixes (the prompt's `uv run --offline pytest -q` cannot import a
  root `app.py`; facts off, 11 of 12 AgentClinic runs hit that error), the
  fallback and the switch (write the label as plain `Test command:`; a
  bold or backticked label is not recognised), the caveat that facts were
  measured headless only, and the rungs 6–9 numbers per condition
  (passes, median requests and wall seconds, write-list and deadline
  counts; output tokens are not in the ladder's `run.json`).
- `mellum-setup` phase 8 (optional, Pi): offers to add a `## Mellum`
  section to the current project's `AGENTS.md`, asking for the test
  command and the optional write-only and do-not lines, and shows the
  section before asking to write it.
- Mellum's prompt (v5), tools, sampling and guards are unchanged.

### Changed

- `docs/ladder/ablation-a17-mode-v012/README.md`: the nudge and tool-error
  rows gave runs-with-one counts labelled as totals (A17 2 and 8); they
  now give both, totals first (A17 3 and 12, A14 7 and 13), matching each
  phase's `table.md`.
- Links to the research and the phase records now point inside this repo
  (`docs/ladder/`, `docs/superpowers/research/`) instead of the research
  repo, so they keep working if that repo goes private. The research notes
  and the recovery bundle moved in with a "Moved from" line; the weights
  link names the Hugging Face model card. README and AGENTS.md say how to
  run the ladder (`cd ladder && uv run python -m pytest`) and that raw
  files are never committed.

## [0.1.2] - 2026-10-09

### Changed

- Mellum Mode's handoff block now opens with a one-line summary (requests,
  output tokens, wall seconds, whether the last command finished and
  passed), lists the last fifteen shell commands Mellum ran with failed or
  unfinished ones marked, and flags a written file that is missing when
  the handoff is built. Found by a run where `mv` made the file list wrong.
- `/mellum off` shows a one-line count of requests, tool calls, output
  tokens and seconds.

### Added

- A run record: each Mellum Mode span appends one JSON line to
  `~/.pi/agent/mellum-mode-runs.jsonl` (task, model, cwd, times, requests,
  token usage, files, commands with pass or fail, final reply) for analysis
  outside the session. `MELLUM_MODE_RUNS` sets the path; `0` disables it.
- README: Mode does not send the project's AGENTS.md, so the task line must
  carry the project's test command and layout rules; the test-command tip
  explains why `pytest` and `python -m pytest` differ on `sys.path`.

## [0.1.1] - 2026-10-09

### Fixed

- Removed the `build` npm script. OpenCode installs Git plugins through
  npm's pacote, which runs a nested `npm install` inside the clone when a
  `build`, `prepare`, `prepack`, or `install` script exists, and that step
  fails inside OpenCode with "git dep preparation failed". A manifest test
  now forbids those script names. `node build.mjs` still regenerates the
  templates.

## [0.1.0] - 2026-10-09

First release.

### Added

- Mellum Mode for Pi: `/mellum <task>`, `/mellum on`, `/mellum off`. Runs
  Mellum inside the current session with the worker prompt and seven file
  tools, rewrites each request to hide the earlier conversation, and hands
  one block per task back to the main model. Runs the child guards (empty
  final-turn nudge, loop breaker) itself while on.
- Mellum Worker for Pi as a pi-subagents child agent, and for OpenCode as a
  subagent, both from one prompt source.
- `mellum-setup` skill: a seven-phase guided installer (preflight, weights,
  oMLX server, provider, agent file, optional delegation rules, smoke test).
- Templates for both hosts, an id-aware JSON merge helper for Pi's
  `models.json`, and a render script for the agent files.
- Recipe and backend docs. oMLX on Apple Silicon is the only backend run;
  Ollama is a documented stub.

[Unreleased]: https://github.com/pauleveritt/mellum-worker/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/pauleveritt/mellum-worker/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/pauleveritt/mellum-worker/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/pauleveritt/mellum-worker/releases/tag/v0.1.0
