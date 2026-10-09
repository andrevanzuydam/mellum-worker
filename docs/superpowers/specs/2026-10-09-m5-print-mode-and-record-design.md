# M.5 design: one-shot Mode in print mode, run record schema 2, the ladder on the shipped extension

Date: 2026-10-09. Research: [steering and next phase](../research/2026-10-09-steering-and-next-phase.md).
Phase row: `ROADMAP.md` M.5. Nothing in this phase touches Mellum's request
path (prompt, messages, tools, sampling) or a guard's decision, so no item
is a measured setting under `docs/sdd.md`; the one ladder launch is a smoke.

## Goal

Three things that the ac-demo runs and A17 showed are missing, grouped
because each is small, none needs a ladder phase, and the third is the
precondition for measuring anything in `extensions/` again:

1. `pi -p "/mellum <task>"` runs the task to completion and writes the run
   record, instead of failing with a stale extension ctx.
2. The run record carries what an analysis needs without the transcript:
   missing files, file-changing commands, the final turn's shape, guard
   counts, how the span was started, and versions.
3. The ladder in mellum-mlx reads the extension, guards, prompt, and agent
   template from a mellum-worker checkout or install, and its own copies
   are deleted.

Alternatives rejected, with the reason, are in §7.

## 1. One-shot Mode under a host without a UI

### Behaviour

In `extensions/mellum-mode.ts`, the `mellum` command handler's one-shot
branch (`/mellum <task>`):

- As today: activate, set `oneShot`, `pi.sendUserMessage(task)`.
- New: if `ctx.hasUI` is `false` and `ctx.waitForIdle` is a function, the
  handler does not return until the task has run and the mode is off:
  `await ctx.waitForIdle()`, then settle (below). Pi's print and JSON modes
  treat a prompt as finished when the command handler returns and dispose
  the runtime right after the last prompt; returning early is the bug.
- Settling is idempotent across the two paths that can deactivate a one
  shot. `agent_settled` keeps its current job (deactivate when
  `active && oneShot`) but stores its in-flight promise; the handler, after
  idle, awaits that promise if one exists, otherwise deactivates itself if
  the mode is still on. Exactly one deactivation happens: one restore of
  the previous model, one off-marker, one record line, one notification.
- Interactive and RPC hosts (`ctx.hasUI` true): unchanged, the handler
  returns at once and `agent_settled` deactivates.
- A host whose ctx lacks `waitForIdle` (older Pi): unchanged behaviour.
- `ctx.hasUI` and `ctx.mode` are read once at the start of the handler,
  while the ctx is certainly live; nothing reads the ctx after `await`
  except through `deactivate`, which already tolerates a missing UI.

### Tests, `tests/mellum-mode-hooks.test.mjs`

The fake Pi gains `hasUI`, `mode`, and a `waitForIdle` spy whose promise
the test resolves after simulating the run (a `context` snapshot and the
`turn_end` events, as the existing record tests do).

- Headless one shot: `ctx.hasUI = false`; after `await mellum("task")`,
  the previous model was restored, the off-marker sent, one record line
  written (`MELLUM_MODE_RUNS` to a temp file), the guard hooks are inert,
  and `waitForIdle` was called once.
- Headless one shot where `agent_settled` fires before idle resolves:
  still exactly one `setModel` restore, one off-marker, one record line.
- One shot with a UI: `waitForIdle` is never called; the handler has
  returned while the mode is still on; `agent_settled` turns it off.
- Ctx without `waitForIdle`: the handler returns, mode on, no throw.
- Record `activation` is `"one-shot"` for the above, `"on"` for `/mellum
  on`, `"headless"` for `MELLUM_MODE=1`, and `host` is the ctx's `mode`.

### Live check (not automated; recorded in the plan's Result)

From a copy of the setup skill's smoke fixture, with the oMLX server up:
`MELLUM_MODE_RUNS=<tmp> pi -p --no-session "/mellum <task naming the test
command>"`. Exit 0; stderr carries neither "stale after session
replacement" nor "could not resolve the persisted assistant entry"; the
record file has one line with `schema: 2`, `host: "print"`,
`activation: "one-shot"`, and the task's files exist.

## 2. Run record schema 2

### Fields

`runRecord(task, span, meta)` keeps every schema-1 field and adds:

| field | type | from |
| --- | --- | --- |
| `schema` | `2` | constant |
| `version` | string | `package.json` next to `extensions/`, read once at load; `"unknown"` if unreadable |
| `promptVersion` | string | the `<!-- mellum-worker prompt vN -->` marker on the loaded prompt's first line, else `"unknown"` |
| `host` | string | `ctx.mode` at activation (`tui`, `rpc`, `print`, `json`), else `"unknown"` |
| `activation` | `"one-shot" \| "on" \| "headless"` | which path activated the span |
| `taskNamesTestCommand` | boolean | `/test command/i` on the task text |
| `edits` | number | count of `edit` and `write` tool calls in the span |
| `filesMissingAtEnd` | string[] | entries of `files` for which `meta.exists(path)` is false; `[]` when no `exists` is given |
| `commands[].mutates` | boolean | `commandMutatesFiles(command)` |
| `finalTurn` | `{ stopReason?: string, hadText: boolean, hadToolCall: boolean }` | the last assistant message of the span; all false and undefined when there is none |
| `nudges` | number | continuations returned by the guard set's `beforeSettle` during the span |
| `guardBlocks` | number | blocks returned by the guard set's `toolCall` during the span |

`meta` gains `exists?`, `host`, `activation`, `promptVersion`, `nudges`,
`guardBlocks`; Mode passes the same `existsSync` resolver the handoff uses
(absolute, else relative to `process.cwd()`), and counts nudges and blocks
in its `agent_before_settle` and `tool_call` handlers. The handoff block
is unchanged (§7).

### `commandMutatesFiles`, a pure function in `extensions/mellum-commands.ts`

True when a shell command can change files or the environment. Quoted
strings and heredoc bodies are removed first; `2>&1`, `>&2`, and
redirects to `/dev/null` are stripped; then any of:

- a redirect `>` or `>>` to a path;
- `rm`, `mv`, `cp`, `touch`, `mkdir`, `rmdir`, `ln`, `chmod`, `chown`,
  `tee`, `truncate`, `install`, `sed -i` as a word at a command position;
- `git` followed by `checkout`, `restore`, `clean`, `stash`, `reset`,
  `rm`, `mv`, `commit`, or `apply`;
- `pip install`, `pip3 install`, `uv add|remove|pip|sync|venv`,
  `python[3] -m venv|pip`, `npm install|i|uninstall`.

Test table, `tests/mellum-commands.test.mjs`: true for `rm
tests/test_hello.py`, `mv hello.py tests/hello.py`, `touch __init__.py`,
`echo hi > out.txt`, `cat <<'X' > f.py` with a body, `git checkout --
x.py`, `pip install pytest`, `uv run python -m venv venv`, `sed -i '' s/a/b/
f`; false for `uv run --offline pytest -q`, `python -c "print(1 > 0)"`,
`grep -v '>' x`, `cmd 2>&1`, `cmd > /dev/null`, `uv run python -c "import
sys; print(sys.path)"`, `git status`, `git diff`, `ls -R`, a heredoc whose
body mentions `rm` with no redirect, `node --test calculator.test.js`.

### Tests, `tests/mellum-mode.test.mjs` and `-hooks`

- `runRecord` on the 20:42 ac-demo span shape: `files` lists the three
  paths, `filesMissingAtEnd` is `["tests/test_hello.py"]` with an `exists`
  that reports it gone, `commands[5].mutates` is true, `edits` is 3,
  `taskNamesTestCommand` is false, `finalTurn` is `{ stopReason: "stop",
  hadText: true, hadToolCall: false }`.
- `runRecord` on an announce-and-stop span (last turn text, no tool call,
  `stopReason: "stop"`, a failed last command): `finalTurn.hadToolCall`
  false, `lastCommand: "failed"`.
- `runRecord` on the 20:10 shape (reads, one passing command, no edits):
  `edits` 0, `files` `[]`.
- A record for a task containing "Test command: node --test x" has
  `taskNamesTestCommand` true.
- Through the hooks: a span with one empty final turn and six identical
  reads records `nudges: 1`, `guardBlocks: 1`; `version` equals
  `package.json`'s; `promptVersion` is `"v5"` with the shipped prompt and
  `"unknown"` with `MELLUM_MODE_PROMPT` pointing at a file with no marker.
- The existing `runRecord` and record-file tests are updated for the new
  fields; the first run of each updated assertion fails before the code.

## 3. The ladder reads the worker from a root (mellum-mlx)

### Behaviour

`ladder/run_ladder.py`:

- `--worker-root PATH`, default `$MELLUM_WORKER_ROOT`, else
  `~/.pi/agent/git/github.com/pauleveritt/mellum-worker` when it exists,
  else an error naming both. A `WorkerFiles` value resolves
  `extensions/mellum-mode.ts`, `extensions/mellum-guards.ts`,
  `prompts/mellum-worker.md`, `templates/pi/mellum-worker.agent.md`, and
  `package.json`; a missing file is an error before any run.
- `PROMPT_FILE`'s default is the root's prompt; `--prompt` still overrides
  (the ablation variants stay in mellum-mlx `prompts/ablation/`).
- `build_pi_direct_args` and `build_pi_chunk_args` take the guards path
  from the root. `build_pi_mode_args(sentence, worker)` passes `-e
  <root>/extensions/mellum-mode.ts -e <record_ext>` and no guards file:
  the shipped Mode runs the guard set itself, and loading
  `mellum-guards.ts` as well would run the nudge twice (A17 ran without
  it).
- Mode runs mirror the operator profile with every `packages` entry
  containing `mellum-worker` removed from the mirror's `settings.json`, so
  the extension loads once, from `-e`. `mirror_agent_dir` gains
  `exclude_packages: tuple[str, ...] = ()`. Delegated and primary runs do
  not exclude it (the package is dormant there; that is what the operator
  runs).
- `prepare_pi_workspace(ws, record_ext, worker)` renders the delegated
  agent file from the root's template with `{{MELLUM_WORKER_ROOT}}`
  replaced by the root and the recorder appended to
  `subagentOnlyExtensions`; it no longer copies a guards file into the
  workspace.
- Each `run.json` records `worker_root`, `worker_version` (package.json),
  and `worker_git` (`git describe --always --dirty` in the root, or
  `null`). The table header is unchanged.
- `ladder/probe_mode_rpc.py` takes the same root.
- Deleted from mellum-mlx: `.pi/mellum/mellum-mode.ts`,
  `.pi/mellum/mellum-guards.ts`, `.pi/agents/mellum-worker.md`,
  `prompts/mellum-worker.md`. Live docs that name them (`README.md`,
  `docs/mellum-worker.md`) say "from `--worker-root`" instead; phase
  READMEs under `docs/research/ladder/` are history and are not edited.

### Tests, mellum-mlx `tests/`

- `test_runner.py`: a fake root in `tmp_path` with the five files;
  `WorkerFiles.resolve` finds them and raises on a missing one; mode args
  carry exactly one `-e` for the mode extension plus the recorder and no
  guards path; direct args' guards path is the root's;
  `test_agent_file_body_matches_prompt` becomes "the template body under
  the fake root matches its prompt" (the shipped repo's own test already
  guards the real pair).
- `test_pi_profile.py`: `mirror_agent_dir(..., exclude_packages=
  ("mellum-worker",))` drops only matching entries and leaves the others
  in order; `prepare_pi_workspace` writes the agent file with the root
  substituted and the recorder appended, and writes no guards file.
- A test that `.pi/mellum` and `.pi/agents/mellum-worker.md` do not exist
  in the repo.

### Smoke, not a phase

`uv run python -m ladder.run_ladder --mode mode --profile baseline --rung 1
--repeat 1 --deadline 600 --worker-root <mellum-worker checkout> --out
docs/research/ladder/smoke-m5-worker-root`. Pass criterion: the rung
passes; requests within A17's rung-1 range (7–9); the trace's first
provider request carries the v5 prompt as its only system message and
seven tools; `run.json` names the root and its git describe. One run; it
proves the launch, not the pass rate. Its README states that.

## 4. Documentation and records

- `README.md` "Use it": one sentence that `pi -p "/mellum <task>"` runs
  one task headlessly and writes the record; the record field list says
  "schema 2" and names the new fields in a clause.
- `docs/recipe.md` §4b: same clause; §5: the ladder reads the worker from
  `--worker-root`.
- `CHANGELOG.md` Unreleased: Fixed (print-mode one shot), Added (record
  fields, `commandMutatesFiles`), with a line that the request path is
  unchanged.
- At close: `ROADMAP.md` M.5 status, the plan's `## Result`, and the
  backlog entries "The ladder measures the repo copy" and "Run-record
  consumers" removed, their outcome being the M.5 row.
- Version and tag: a release is Paul's step. The phase leaves
  `package.json` at 0.1.2; bumping it, the README install lines, and the
  changelog heading happen together when v0.1.3 is tagged.

## 5. Order of implementation

1. `commandMutatesFiles` with its table (pure, fastest to TDD).
2. Record schema 2 in `runRecord` and `spanStats`; Mode's counters and
   `meta`; tests updated.
3. The headless one-shot handler and its four hook tests.
4. Docs and changelog in this repo; `npm test` green.
5. mellum-mlx: `WorkerFiles`, args builders, mirror exclusion, workspace
   render, deletions, probe, docs; `uv run pytest` green.
6. The rung-1 smoke from the checkout; its README.
7. The live print-mode check (§1); results into the plan's `## Result`.

Steps 1–4 and 5 are independent and can run as parallel subagents; 6
depends on 3 and 5; 7 on 3.

## 6. Acceptance

- `npm test` passes; every new or changed assertion was shown failing
  first (the plan quotes the failing line).
- The live print-mode check passes as stated in §1.
- mellum-mlx `uv run pytest` passes; `grep -rn ".pi/mellum" ladder
  README.md docs/mellum-worker.md` is empty.
- The smoke passes its criterion and its record directory is committed in
  mellum-mlx.
- The interactive tests for `on`, `off`, and one shot with a UI pass
  unchanged.
- `docs-caps.test.mjs` passes after the roadmap and backlog edits.

## 7. Excluded, and alternatives rejected

- **Any edit to `prompts/mellum-worker.md`**, the templates, the filter,
  the tool list, or a guard's decision. Measured settings; the research
  note sizes the prompt experiment (a sixth fixture, prompt v6, two
  phases) and leaves it in the backlog.
- **A Mode-side preflight that injects the test command into the task.**
  Changes what Mellum reads; the current fixtures would never trigger it;
  dominated by the prompt change once a fixture exists. Backlog.
- **A guard that blocks `rm`/`mv` of a span-written file.** A guard change
  with no fixture; the model's next move (a `sys.path` hack) is not
  better. Not proposed.
- **Handoff text changes.** The handoff already lists every command and
  flags missing files; the parent can read `rm`. Marking mutating commands
  in the handoff is a one-liner once `mutates` exists and can ride a later
  phase if a parent misreads one.
- **The ladder driving `pi -p "/mellum <sentence>"`** as a runner mode.
  Possible after §1 and worth doing (it would measure the shipped
  command and write records in ladder runs), but it changes the measured
  launch and so is a phase, not a smoke. Backlog.
- **An announce-and-stop nudge.** One miss in 30; `finalTurn` is how a
  second one gets counted. Backlog, unchanged.
- **A record consumer** (a summariser). Nothing reads the record yet; the
  schema change is sized by this analysis, and the consumer is the next
  one that needs a field.
- **OpenCode**: no Mode, no record, no counterpart.
- **The v0.1.3 tag.**
