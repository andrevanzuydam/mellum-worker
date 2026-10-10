# Changelog

Versions match git tags; pin one in both install lines.

## [Unreleased]

### Fixed

- `/mellum <task>` under `pi -p` (and `pi --mode json`) returned at once,
  Pi disposed the runtime mid-run ("This extension ctx is stale"), and no
  run record was written. It now waits for the run, switches back, and
  writes the record before Pi exits. When the host has no UI, warnings and
  errors (the model is missing, Mode did not start in time) go to stderr
  instead of vanishing.

### Added

- `ladder/`: rungs 6 to 9, the four AgentClinic phases, to measure
  whether Mellum can build a small project from its specs. A rung passes
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
  with `cd ladder && uv run python -m pytest`.
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
  run record gains `facts` (`source`, `testCommand`, `chars`) and the
  handoff summary line names the source. Not yet shipped advice: the
  ladder's A19 decides whether it stays.
- Mellum's prompt (v5), tools, sampling and guards are unchanged.

### Changed

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
