---
phase: M.5
cycle: 1
lifecycle: active
---

# M.5 (mellum-worker half): one-shot print mode and run record schema 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pi -p "/mellum <task>"` runs the task to completion and writes a
schema-2 run record; the record carries missing files, file-changing
commands, the final turn's shape, guard counts, activation, host, versions.

**Architecture:** A pure `commandMutatesFiles` in a new
`extensions/mellum-commands.ts`; `spanStats`/`runRecord` in
`extensions/mellum-mode.ts` grow the schema-2 fields; Mode's hooks count
nudges and blocks and pass host, activation and prompt version as `meta`;
the `mellum` command handler waits for the run when the host has no UI.

**Tech Stack:** TypeScript run directly by Node ≥ 24 (type stripping: only
erasable syntax, no enums or parameter properties), `node:test`, Pi 1.0.2.

**Spec:** `docs/superpowers/specs/2026-10-09-m5-print-mode-and-record-design.md`
(§1, §2, §4 for this repo). Research:
`docs/superpowers/research/2026-10-09-steering-and-next-phase.md`.

## Scope of this plan

This plan covers spec §1, §2, §4 (this repo's docs) and §5 steps 1–4 and 7.
Spec §3 (mellum-mlx `--worker-root`, deleting its copies, probe, docs) and
§5 step 6 (the rung-1 smoke) are **not** in this plan: they change another
repository and wait for Paul. The plan stays `lifecycle: active` until they
land; the roadmap row, backlog removals and `## Result` close-out happen then.

## Global Constraints

- Nothing on Mellum's request path changes: `prompts/mellum-worker.md`,
  `templates/`, `filterForMellum`, `WORKER_TOOLS`, sampling, and every guard
  decision in `extensions/mellum-guards.ts` stay byte-identical.
- `package.json` stays at `0.1.2`; no tag, no version bump, no push.
- `package.json` `pi.extensions` stays `["./extensions/mellum-mode.ts"]`
  (`tests/manifest.test.mjs` asserts it); the new module is imported, not listed.
- Every new or changed assertion is run and seen failing before the code
  that makes it pass (`docs/sdd.md`); each task's report quotes the failing line.
- Commits are conventional (`feat(mode):`, `test(mode):`, `docs:`) and end
  with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run the whole suite with `npm test` from the worktree root; one file with
  `node --test tests/<file>.test.mjs`.

## Deviation from the spec (§1), and why

The spec says the handler awaits `ctx.waitForIdle()` right after
`pi.sendUserMessage(task)`. In Pi 1.0.2 that returns at once: `sendUserMessage`
is fire-and-forget, and `session.prompt()` awaits input handlers, the auth
check and `before_agent_start` before `_runAgentPrompt` sets
`_isAgentRunActive`, which is all `isIdle` reads
(`dist/core/agent-session.js` 1038, 1352, 1885). The handler would then
deactivate before the run started, and the task would run on the parent
model. So the headless handler first waits for the run to start (an
`agent_start` hook resolves a promise), bounded by a start timeout
(default 60 s, overridable through the factory's second argument for tests),
then awaits `waitForIdle`, then settles. Pi resolves the idle wait only after
`agent_settled` handlers return (`_emitAgentSettled`, 671–693), so normally
the `agent_settled` path deactivates and the handler awaits its promise.

## Review Focus

1. A command that chains a mutation after a harmless one (`cd x && rm y`,
   `make 2>&1 | tee log`) is mutating; a mutating word as an argument
   (`echo rm`) is not. Task 1 table.
2. `cmd > /dev/null 2>&1` is not mutating; `ls >> log` is. Task 1 table.
3. The run never starts in print mode (model auth failure): the handler
   must not hang; it deactivates after the start timeout. Task 4 test.
4. `agent_settled` and the handler both try to settle: exactly one
   restore, one off-marker, one record line. Task 4 test.
5. A span with no assistant turn: `finalTurn` is
   `{ hadText: false, hadToolCall: false }` and `edits` 0. Task 2 test.

---

### Task 1: `commandMutatesFiles`

**Files:** Create `extensions/mellum-commands.ts`, `tests/mellum-commands.test.mjs`.

**Interfaces:** Produces `export function commandMutatesFiles(command: string): boolean`.

- [ ] **Step 1: Write the failing table test.** One `test()` per row is not
  needed; one test for the true list, one for the false list, each
  asserting with the command in the message:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { commandMutatesFiles } from "../extensions/mellum-commands.ts";

const MUTATING = ["rm tests/test_hello.py", "mv hello.py tests/hello.py", "touch __init__.py",
	"echo hi > out.txt", "cat <<'X' > f.py\nprint(1)\nX", "git checkout -- x.py", "pip install pytest",
	"uv run python -m venv venv", "sed -i '' s/a/b/ f", "cd x && rm y", "make 2>&1 | tee log.txt", "ls >> log"];
const READ_ONLY = ["uv run --offline pytest -q", 'python -c "print(1 > 0)"', "grep -v '>' x", "cmd 2>&1",
	"cmd > /dev/null", "cmd > /dev/null 2>&1", 'uv run python -c "import sys; print(sys.path)"', "git status",
	"git diff", "ls -R", "cat <<'EOF'\nrm -rf build\nEOF", "node --test calculator.test.js", "echo rm"];

test("commands that change files or the environment are mutating", () => {
	for (const c of MUTATING) assert.equal(commandMutatesFiles(c), true, c);
});
test("read-only commands are not", () => {
	for (const c of READ_ONLY) assert.equal(commandMutatesFiles(c), false, c);
});
```

- [ ] **Step 2: Run** `node --test tests/mellum-commands.test.mjs`. Expected:
  fails, module not found. Quote the line.
- [ ] **Step 3: Implement.** Order matters: heredoc bodies first (keep the
  `<<WORD` line, drop body and terminator), then quoted strings (`'…'`,
  `"…"` with escapes) replaced by `''`, then strip `\d*>&\d+` and
  `&?\d*>>?\s*/dev/null`. Then true if any of:
  - `/>>?\s*[^\s&|;)]/` remains (a redirect to a path);
  - splitting on `;`, `&&`, `||`, `|`, `&`, newline, `(`, `` ` `` and
    `$(`, a segment's first word (after `VAR=value` prefixes and `sudo`,
    basename of a path) is one of `rm mv cp touch mkdir rmdir ln chmod
    chown tee truncate install`, or is `sed` with a `-i…` argument;
  - `/\bgit\s+(checkout|restore|clean|stash|reset|rm|mv|commit|apply)\b/`,
    `/\bpip3?\s+install\b/`, `/\buv\s+(add|remove|pip|sync|venv)\b/`,
    `/\bpython3?\s+-m\s+(venv|pip)\b/`, `/\bnpm\s+(install|i|uninstall)\b/`.
  Module doc comment: what "mutating" means and that it is a heuristic for
  the run record only (never a guard).
- [ ] **Step 4: Run** the file, then `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(mode): commandMutatesFiles, a heuristic for file-changing shell commands`.

### Task 2: run record schema 2 (pure functions)

**Files:** Modify `extensions/mellum-mode.ts` (`SpanStats`, `spanStats`,
`RunRecord`, `runRecord`, new exports); `tests/mellum-mode.test.mjs`;
`tests/mellum-mode-hooks.test.mjs` (the record-file test's `commands`
assertion only).

**Interfaces:**
- Consumes `commandMutatesFiles` from Task 1.
- Produces, exported from `extensions/mellum-mode.ts`:
  - `PACKAGE_VERSION: string` — `version` of `../package.json` relative to
    the module, read once at load inside `try`, `"unknown"` on any error.
  - `promptVersionOf(prompt: string): string` — `vN` from
    `/^<!--\s*mellum-worker prompt (v\d+)\s*-->/` on the first line, else `"unknown"`.
  - `type Activation = "one-shot" | "on" | "headless"`.
  - `interface RecordMeta { endedAt: number; cwd: string; model: string;
    exists?: (path: string) => boolean; host?: string; activation?: Activation;
    promptVersion?: string; nudges?: number; guardBlocks?: number }`.
  - `runRecord(task: string, span: Msg[], meta: RecordMeta): RunRecord`.
  - `SpanStats` gains `edits: number` and
    `finalTurn: { stopReason?: string; hadText: boolean; hadToolCall: boolean }`.
  - `RunRecord` gains `schema: 2`, `version`, `promptVersion`, `host`,
    `activation` (`Activation | "unknown"`), `taskNamesTestCommand`,
    `edits`, `filesMissingAtEnd: string[]`, `finalTurn`, `nudges`,
    `guardBlocks`, and `commands: { command; failed; mutates }[]`.

Defaults when `meta` omits a field: `host` and `promptVersion` and
`activation` `"unknown"`, `nudges` and `guardBlocks` `0`,
`filesMissingAtEnd` `[]` (no `exists`). `finalTurn` comes from the span's
last assistant message: `stopReason` is its `stopReason` if a string,
`hadText` any non-blank `text` block, `hadToolCall` any `toolCall` block;
with no assistant message, `{ hadText: false, hadToolCall: false }`.
`edits` counts `edit` and `write` tool calls (not unique paths).
`taskNamesTestCommand` is `/test command/i.test(task)`. `mutates` is
`commandMutatesFiles` of the untruncated command.

- [ ] **Step 1: Write failing tests** in `tests/mellum-mode.test.mjs`
  (a `msg` helper for assistant turns keeps them short):
  - **20:42 shape**: three `write`s (`hello.py`, `tests/test_hello.py`,
    `test_hello.py`) and seven bash calls in the recorded order
    (`docs/superpowers/research/2026-10-09-steering-and-next-phase/mellum-mode-runs.jsonl`
    line 3: index 5 is `rm tests/test_hello.py`), last assistant turn
    text with `stopReason: "stop"`. With
    `exists: (p) => p !== "tests/test_hello.py"`: `files` has the three
    paths, `filesMissingAtEnd` `["tests/test_hello.py"]`,
    `commands[5].mutates` true, `commands[0].mutates` false, `edits` 3,
    `taskNamesTestCommand` false, `finalTurn`
    `{ stopReason: "stop", hadText: true, hadToolCall: false }`, `schema` 2.
  - **announce-and-stop**: a failed last bash, then a text-only turn with
    `stopReason: "stop"`: `finalTurn.hadToolCall` false, `lastCommand` `"failed"`.
  - **20:10 shape**: one `ls`/`read`, one passing bash, text reply: `edits`
    0, `files` `[]`, `filesMissingAtEnd` `[]`.
  - **no assistant turn** (Review Focus 5): `finalTurn` deep-equals
    `{ hadText: false, hadToolCall: false }`, `edits` 0.
  - task `"fix it. Test command: node --test x"` → `taskNamesTestCommand` true.
  - meta passthrough: `host: "print"`, `activation: "one-shot"`,
    `promptVersion: "v5"`, `nudges: 1`, `guardBlocks: 2` appear as given;
    omitted meta gives the defaults above; `version` equals
    `JSON.parse(readFileSync("package.json")).version`.
  - `promptVersionOf("<!-- mellum-worker prompt v5 -->\nYou edit")` is
    `"v5"`; `promptVersionOf("no marker")` is `"unknown"`.
  - Update the existing `runRecord` test's `commands` assertion to include
    `mutates: false`, and the hooks file's record-file test likewise.
- [ ] **Step 2: Run** both files. Expected: the new assertions fail
  (`undefined !== 2`, missing exports). Quote one line per test.
- [ ] **Step 3: Implement** in `spanStats` (count edits in the existing
  toolCall loop; track the last assistant message for `finalTurn`) and
  `runRecord`. Import `commandMutatesFiles` from `./mellum-commands.ts`.
  `handoffMessage` and the handoff text stay unchanged.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(mode): run record schema 2 — missing files, mutating commands, final turn, versions`.

### Task 3: Mode passes the schema-2 meta

**Files:** Modify `extensions/mellum-mode.ts` (default export: `activate`,
`writeRunRecord`, `tool_call`, `agent_before_settle`, `session_start`,
command handler); `tests/mellum-mode-hooks.test.mjs`.

**Interfaces:**
- Consumes `RecordMeta`, `Activation`, `promptVersionOf` from Task 2.
- Produces `activate(ctx, notify: boolean, activation: Activation)`; per
  span state `host`, `activation`, `promptVersion`, `nudges`, `guardBlocks`
  reset in `activate`. Task 4 calls `activate(ctx, true, "one-shot")`.

Behaviour: `host` is `typeof ctx.mode === "string" ? ctx.mode : "unknown"`
read in `activate`. `/mellum on` and `/mellum` (empty) → `"on"`;
`MELLUM_MODE=1` at `session_start` → `"headless"`; `/mellum <task>` →
`"one-shot"`. `promptVersion = promptVersionOf(prompt)` after `loadPrompt()`.
`tool_call`: if the guard result has `block`, `guardBlocks += 1`.
`agent_before_settle`: if the result has `continue`, `nudges += 1`.
`writeRunRecord` passes `exists` (the same resolver the `context` hook
gives `collapseHandoffs`: absolute, else relative to `process.cwd()` —
extract it as one function `existsInCwd` used by both), `host`,
`activation`, `promptVersion`, `nudges`, `guardBlocks`.

- [ ] **Step 1: Write failing hook tests.** Extend `recordingPi()` to
  accept `{ mode }` and set `ctx.mode`. With `MELLUM_MODE_RUNS` on a temp file:
  - `/mellum on` in `mode: "tui"`, a context snapshot, six identical reads
    through `tool_call`, an empty turn via `turn_end`, one
    `agent_before_settle`, then `/mellum off`: the line has `nudges` 1,
    `guardBlocks` 1, `activation` `"on"`, `host` `"tui"`, `promptVersion`
    `"v5"`, `version` equal to `package.json`'s.
  - `MELLUM_MODE_PROMPT` set to a temp file containing `no marker`:
    `promptVersion` `"unknown"`.
  - `MELLUM_MODE=1`, `handlers.session_start({}, ctx)` with `mode: "json"`,
    a snapshot, then `/mellum off`: `activation` `"headless"`, `host` `"json"`.
  - `/mellum fix it` with a UI (`hasUI: true`), snapshot, then
    `handlers.agent_settled({}, ctx)`: `activation` `"one-shot"`.
  - A ctx with no `mode`: `host` `"unknown"`.
  Restore every env var in `finally`.
- [ ] **Step 2: Run** the hooks file. Expected: new assertions fail
  (`undefined !== 1`). Quote them.
- [ ] **Step 3: Implement** as described above.
- [ ] **Step 4: Run** `npm test`. Expected: all pass; the existing
  `on`/`off`/guard tests pass unchanged.
- [ ] **Step 5: Commit** `feat(mode): record activation, host, prompt version, nudges and guard blocks`.

### Task 4: one shot under a host without a UI

**Files:** Modify `extensions/mellum-mode.ts` (default export signature,
command handler, `agent_settled`, new `agent_start` hook);
`tests/mellum-mode-hooks.test.mjs`.

**Interfaces:**
- Consumes `activate(ctx, true, "one-shot")` from Task 3.
- Produces `export default function (pi: any, options: { startTimeoutMs?: number } = {})`
  (Pi calls it with one argument; default 60 000 ms).

Behaviour (see "Deviation" above):
- `settle(ctx)`: if `settling` is set return it; else set
  `oneShot = false` and `settling = deactivate(ctx)` (cleared in `finally`
  once it resolves) and return it. `agent_settled`: `if (active && oneShot) await settle(ctx)`.
- Handler, one-shot branch: read `const headless = ctx.hasUI === false && typeof ctx.waitForIdle === "function"`
  before anything is awaited. After `activate` succeeds and `oneShot = true`:
  if headless, create the `started` promise (resolved by an `agent_start`
  hook while `oneShot`), then `pi.sendUserMessage(want)`, then
  `await Promise.race([started, timeout(startTimeoutMs)])` (clear the
  timer), `await ctx.waitForIdle()`, then
  `if (settling) await settling; else if (active && oneShot) await settle(ctx)`.
  Otherwise send and return, as today.
- With a UI, or without `waitForIdle`: unchanged.

- [ ] **Step 1: Write failing tests.** A `headlessPi({ hasUI, withWait, startsRun, settledFirst })`
  fake: `sendUserMessage` schedules (with `setImmediate`) the run:
  `handlers.agent_start({}, ctx)` (when `startsRun`), a `context`
  snapshot with the task, the marker and one assistant text turn, a
  `turn_end`; when `settledFirst`, `await handlers.agent_settled({}, ctx)`
  before resolving the idle promise. `ctx.waitForIdle` is a spy returning
  that idle promise. Record `setModel`, `sendMessage`, `notify` calls.
  - headless: after `await mellum("fix it")`, `waitForIdle` called once,
    last `setModel` is the parent model, one off-marker, one record line
    with `activation` `"one-shot"` and `host` `"print"`, guard hooks inert.
  - headless with `settledFirst`: exactly one restore `setModel`, one
    off-marker, one record line.
  - with a UI: `waitForIdle` never called; the handler has returned while
    the mode is on (a sixth identical read is blocked); then
    `agent_settled` turns it off.
  - no `waitForIdle` on a headless ctx: returns, mode on, no throw.
  - headless, run never starts, `install(pi, { startTimeoutMs: 20 })`:
    returns within a second, mode off, no record line.
- [ ] **Step 2: Run** the hooks file. Expected: headless tests fail (mode
  still on after return / `waitForIdle` called 0 times). Quote them.
- [ ] **Step 3: Implement.** Update the file's header comment: one shot
  under `pi -p` waits for the run and writes the record before returning.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `fix(mode): /mellum <task> under pi -p waits for the run and settles once`.

### Task 5: docs and changelog

**Files:** `README.md` ("Use it", the record paragraph near line 77),
`docs/recipe.md` §4b (record sentence near line 208), `CHANGELOG.md` `[Unreleased]`.

- README: one sentence that `pi -p "/mellum <task>"` runs one task
  headlessly and writes the record; the record paragraph says "schema 2"
  and names, in one clause, missing files at end, file-changing commands,
  the final turn's shape, nudge and block counts, activation, host,
  package and prompt versions.
- recipe §4b: the same clause. §5 (`--worker-root`) is left for the
  mellum-mlx half; it would be false today.
- CHANGELOG `[Unreleased]`: **Fixed** `/mellum <task>` under `pi -p` (and
  `--mode json`) ran on a disposed runtime ("extension ctx is stale") and
  wrote no record; now it waits for the run. **Added** run record schema 2
  fields and `commandMutatesFiles`. One line: Mellum's request path
  (prompt, messages, tools, sampling, guards) is unchanged.
- [ ] **Step 1:** Edit; keep `package.json`, install lines, and headings at 0.1.2.
- [ ] **Step 2: Run** `npm test` (`docs.test.mjs` checks links and pinned lines).
- [ ] **Step 3: Commit** `docs: print-mode one shot and run record schema 2`.

### Task 6: live print-mode check (controller, not a subagent)

- [ ] Copy `skills/mellum-setup/smoke/calculator` into a fresh `mktemp -d`;
  `node --test calculator.test.js` exits 1 there.
- [ ] From that directory, with oMLX on 127.0.0.1:8001:
  `MELLUM_MODE_RUNS=<tmp>/runs.jsonl pi -p --no-session --no-extensions -e <worktree>/extensions/mellum-mode.ts "/mellum the cart total ignores quantity, fix it. Test command: node --test calculator.test.js"`
  (`--no-extensions` keeps the installed v0.1.2 package's `/mellum` out;
  the installed package is not modified).
- [ ] Pass: exit 0; stderr has neither "stale after session replacement"
  nor "could not resolve the persisted assistant entry"; one record line
  with `schema` 2, `host` `"print"`, `activation` `"one-shot"`; the test
  command exits 0 in the fixture.
- [ ] Record the outcome and the line under Progress below.

## Progress

- Task 1: done, e63321e. RED: module not found.
- Task 2: done, 66a76e2. RED e.g. `undefined !== 2` (schema).
- Task 3: done, 9cafb35. RED e.g. `0 !== 1` (nudges); assertions masked
  or passing first were shown failing by mutation (`'unknown' !== 'tui'`).
- Task 4: done, d7ec11a. RED: `waitForIdle called once (actual: 0)`;
  UI and no-`waitForIdle` cases pin old behaviour, shown failing by mutation.
- Task 6 (run before Task 5): passed 2026-10-09 on Pi 1.0.2. Exit 0,
  stderr empty, 7 requests, about 7 s, `node --test` 3/3 afterwards. The
  record (`cwd` is a scratch copy of the fixture):
  `{"schema":2,"version":"0.1.2","promptVersion":"v5","host":"print","activation":"one-shot","wallSeconds":7,"taskNamesTestCommand":true,"requests":7,"files":["calculator.js"],"edits":1,"filesMissingAtEnd":[],"commands":[{"command":"node --test calculator.test.js","failed":false,"mutates":false}],"lastCommand":"ok","finalTurn":{"stopReason":"stop","hadText":true,"hadToolCall":false},"nudges":0,"guardBlocks":0,…}`.
  Control, the same command with main's extension: exit 0, empty stdout,
  stderr "turn_end could not resolve the persisted assistant entry ID" and
  "This extension ctx is stale…", no record, tests still failing.
- Task 5: done, 3284561.
- Final review fix wave: e085bd8 (warnings and errors go to stderr when
  the host has no UI, including a new start-timeout warning; before this,
  `pi -p "/mellum …"` with the model missing exited 0 with no output),
  8b00318 (`commandMutatesFiles` sees commands after `then`, `do`, `{`,
  `!`, `env`, `nohup`, `xargs`, `sudo -u x`; here-strings), eeca1fa (docs:
  lines without `schema` are schema 1).
- Live check repeated at eeca1fa: exit 0, stderr empty, one schema-2 line
  (`host` print, `activation` one-shot, 7 requests, 11 s), tests 3/3. With
  `MELLUM_MODE_MODEL=no-such-model`: exit 0, stderr
  `mellum-mode: model omlx/no-such-model not found; mode stays off`.
  Run `pi -p` with stdin closed (`< /dev/null`); with an open stdin pipe
  Pi waits for it before starting.
- `npm test`: 96/96 (75 at baseline).

Remaining for this phase (not in this plan): spec §3 (mellum-mlx reads the
worker from `--worker-root`, its copies deleted, tests, docs), §5 step 6
(the rung-1 smoke), recipe §5, and the close-out in §4 (roadmap Status,
backlog removals, `## Result`).
