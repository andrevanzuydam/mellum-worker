---
phase: M.7A
cycle: 1
lifecycle: active
---

# M.7A Learn and Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/mellum check` (oMLX and provider settings against the measured profile, also on activation) and `/mellum learn` (rule-based patterns in Mode's run records, with a `## Mellum` suggestion written only on a yes), plus a host-neutral `scripts/mellum.mjs` for the terminal, OpenCode and Pi Worker.

**Architecture:** Two pure TypeScript modules, `extensions/mellum-check.ts` and `extensions/mellum-learn.ts`, fed by thin front ends: subcommands in `extensions/mellum-mode.ts` and a Node CLI in `scripts/mellum.mjs` (Node 24 runs the `.ts` imports, as the tests already do). One data file, `templates/omlx-model-settings.json`, is the single source of expected settings, tied by tests to the ladder's `baseline` profile, the setup skill's step 3 and the README.

**Tech Stack:** TypeScript extension under Pi 1.0.2 (`node --test`), Node 24 global `fetch`, Python 3.14 ladder test (uv, pytest), oMLX admin API (`/admin/api/models`, `/admin/api/global-settings`).

**Spec:** `docs/superpowers/specs/2026-10-11-m7a-learn-and-check-design.md`

## Global Constraints

- Never write to the oMLX server (no `PUT`, no `POST`); the check only shows the `PUT` command. Never call a model and never run `pi` or `/mellum`: Task 6's live checks are HTTP reads of `/v1/models` and `/admin/api/*` only, so they use no GPU.
- Expected model settings exactly as spec §1's JSON (`max_tokens` 4096, `forced_ct_kwargs` null, `enable_thinking` true, `turboquant_kv_enabled` false, …); `global`: `scheduler.max_concurrent_requests` 1, `cache.hot_cache_max_size` `"0"`; `advice`: `memory.memory_guard_custom_ceiling_gb` 14.
- Activation check: admin GET only, timeout 1,000 ms, silent when unreadable, never blocks; message format `Mellum server settings differ: <key> <actual> (expected <expected>)[, …]. Run /mellum check.`
- `learn`: default `n` 10; patterns, thresholds and wording exactly spec §3's table; writes `AGENTS.md` only after `ctx.ui.confirm` returns true; the script never writes.
- Record fields: `server: { match: boolean | null, diffs: { key, expected, actual }[] }`; `kind` read as `"mode"` when absent; Worker records file `~/.pi/agent/mellum-worker-runs.jsonl`.
- No change to `prompts/`, the filter, tools, sampling, guards or the agent templates. `CHANGELOG.md` `[Unreleased]` entry in the same commit as each user-facing change; doc caps hold; every new assertion seen failing first.
- Branch `m7a-learn-and-check` in a worktree off `main`; commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; no push, tag, release, version bump or merge.

## Review Focus

1. **`/mellum check the export totals` is a task, not the check.** Only an exact `check`, `learn`, or `learn <digits>` argument selects a subcommand; anything else is a one-shot task (Task 3 and Task 5 tests).
2. **A slow or hanging admin API.** Activation never waits more than about 1 s and still activates; the script's fetches time out at 3 s and report `server`/`admin` findings instead of hanging (Task 3 test with a fetch that never resolves).
3. **An `AGENTS.md` whose `## Mellum` section sits in the middle, or that lacks a trailing newline.** Missing bullets go at the end of that section, before the next heading; other text is byte-identical (Task 5 test).
4. **A run log with a truncated last line or non-JSON lines.** `learn` skips and counts them; it never throws (Task 4 test).
5. **OpenCode config with comments and trailing commas, or no config at all.** The `provider` finding reports it; parsing never throws (Task 2 test).

---

### Task 1: One source of expected settings

**Files:**
- Create: `templates/omlx-model-settings.json`, `tests/settings-source.test.mjs`, `ladder/tests/test_settings_source.py`
- Modify: `skills/mellum-setup/reference/03-server.md` (table and `PUT`), `README.md` ("Use it": a **Model settings** paragraph after "Right-sizing the task"), `CHANGELOG.md`

**Interfaces:**
- Produces: the data file at spec §1's shape; nothing executable.

- [ ] **Step 1: Write the failing tests.** Python (`ladder/tests/test_settings_source.py`): load the JSON from `REPO_ROOT / "templates" / "omlx-model-settings.json"`; assert `{k: v for k, v in data["model"].items() if k not in ("turboquant_kv_enabled", "enable_thinking")} == PROFILES["baseline"]`. Node (`tests/settings-source.test.mjs`): read the data file; in `03-server.md`, every `model` key that the table lists has the data file's value in its row, and the `PUT` command's JSON body parses to an object whose keys are a subset of `model` with equal values, and that includes `max_tokens`, `max_context_window`, `forced_ct_kwargs`; in `README.md`, the Model settings table rows read `| model id | Mellum2.1-12B-A2.5B-Thinking-6bit |`, `| context window | 56,000 |`, `| generation ceiling (max_tokens) | 4,096 |`, `| thinking | on |`, `| sampling | 1 / 0.95 / 20 |`, `| concurrent requests | 1 |`, `| hot cache | off |`, each derived from the data file or the Pi provider template (sampling), formatted with `toLocaleString("en-US")`.
- [ ] **Step 2:** Run both suites; all new tests fail (file missing). Record in Progress.
- [ ] **Step 3:** Write the data file verbatim from spec §1. Change `03-server.md`: `max_tokens` row → `4096` with "every published number used 4,096; 16,384 is untested on the current recipe (backlog)"; `forced_ct_kwargs` row → `null` (unset) with "the ladder never forced it; the server's thinking default is on"; the `PUT` body → `{"max_context_window":56000,"max_tokens":4096,"forced_ct_kwargs":null}`. Add the README paragraph: one sentence, the table above, and "Other clients of the same oMLX model can change these; `/mellum check` shows drift."
- [ ] **Step 4:** `npm test` and `cd ladder && uv run python -m pytest -q -m "not slow"` green. CHANGELOG `[Unreleased]` "Changed": the setup skill now writes the measured server settings (4,096, thinking not forced) and the README lists them. Commit `feat(setup): one source of expected oMLX settings, the measured profile`.

### Task 2: The check, pure

**Files:**
- Create: `extensions/mellum-check.ts`, `tests/mellum-check.test.mjs`, `tests/fixtures/check/` (`admin-models-match.json`, `admin-models-drift.json`, `global-settings.json`, `v1-models.json`, `pi-models.json`, `pi-models-no-omlx.json`, `opencode.jsonc`)

**Interfaces:**
- Consumes: Task 1's data file.
- Produces:
  - `export type Level = "ok" | "info" | "warn" | "fail"`; `export interface Finding { id: "server" | "model" | "settings" | "global" | "advice" | "provider" | "admin"; level: Level; message: string; fix?: string }`
  - `export interface Expected { modelId: string; model: Record<string, unknown>; global: Record<string, unknown>; advice: Record<string, unknown> }`; `export function loadExpected(read?: (p: string) => string): Expected` (reads `../templates/omlx-model-settings.json` relative to the module).
  - `export type Fetched<T> = { ok: true; value: T } | { ok: false; status?: number; error: string }`
  - `export interface CheckInputs { baseUrl: string; models: Fetched<unknown>; adminModels: Fetched<unknown>; global: Fetched<unknown>; provider: { host: "pi" | "opencode"; entry?: Record<string, unknown>; error?: string }; template: Record<string, unknown> }`
  - `export function settingsDiffs(adminModels: unknown, expected: Expected): { key: string; expected: unknown; actual: unknown }[] | null` (null when the model or its `settings` is absent)
  - `export function checkSetup(inputs: CheckInputs, expected: Expected): Finding[]` (findings in the spec §2 table order)
  - `export function parseJsonc(text: string): unknown` (strips `//` and `/* */` comments outside strings and trailing commas)
  - `export function readProvider(host, home: string, read: (p: string) => string | undefined): { baseUrl: string; entry?: Record<string, unknown>; error?: string }` (Pi: `<home>/.pi/agent/models.json` provider `omlx`, model `Mellum2.1-12B-A2.5B-Thinking-6bit`; OpenCode: `<home>/.config/opencode/opencode.jsonc` then `.json`, `provider.omlx`; default `baseUrl` `http://127.0.0.1:8001/v1`)
  - `export function putCommand(adminBase: string, expected: Expected): string`; `export function formatFindings(f: Finding[]): string` (fails first, then warns, info; all `ok` collapsed into `N checks ok`)

- [ ] **Step 1: Fixtures.** `admin-models-match.json`: `curl -s http://127.0.0.1:8001/admin/api/models` from Paul's server (read-only GET; it currently matches the data file), trimmed to the Mellum entry plus one other model. `admin-models-drift.json`: the same with `max_tokens` 16384, `forced_ct_kwargs` `["enable_thinking"]`, `turboquant_kv_enabled` true. `global-settings.json`: `curl -s …/admin/api/global-settings`, trimmed to `server`, `scheduler`, `cache`, `memory`. `v1-models.json`: `curl -s …/v1/models`. `pi-models.json` from `templates/pi/models.omlx.json`; `pi-models-no-omlx.json` with only another provider; `opencode.jsonc` from `templates/opencode/provider.omlx.json` wrapped as `{ "provider": … }` with a `//` comment, a `/* */` comment and a trailing comma.
- [ ] **Step 2: Write failing tests:** match fixture → `settings` ok, no `fix`; drift fixture → `settings` fail with one message line per differing key and `fix` equal to `putCommand(…)`; `models` fetch `{ok:false,error:"ECONNREFUSED"}` → `server` fail, and `model`/`settings` not reported as ok; admin `{ok:false,status:401}` → `admin` warn "settings not readable", no `settings` finding; `v1-models` without the id → `model` fail; global with `max_concurrent_requests` 2 → `global` warn; advice memory 48 → `advice` info; `readProvider("pi", …)` on `pi-models-no-omlx.json` → `error` and `provider` fail; `parseJsonc` on `opencode.jsonc` parses (Review Focus 5) and on `""` returns `undefined` without throwing; `readProvider("opencode", …)` with no files → default `baseUrl` and `error`; `formatFindings` puts fails first and collapses oks.
- [ ] **Step 3:** Run `npm test`; the new tests fail (module missing). Record in Progress.
- [ ] **Step 4:** Implement. Compare values with `JSON.stringify` equality per key. Admin base = `baseUrl` with a trailing `/v1` removed.
- [ ] **Step 5:** `npm test` green. Commit `feat(check): compare oMLX and provider settings with the measured profile` (no CHANGELOG entry: nothing user-facing until Task 3).

### Task 3: The check, wired in

**Files:**
- Create: `scripts/mellum.mjs`, `tests/mellum-cli.test.mjs`
- Modify: `extensions/mellum-mode.ts` (subcommand parse, `/mellum check`, activation check, `RecordMeta`/`RunRecord` `server`), `tests/mellum-mode-hooks.test.mjs`, `tests/mellum-mode.test.mjs`, `CHANGELOG.md`

**Interfaces:**
- Consumes: Task 2's exports.
- Produces: `export async function fetchJson(url: string, opts: { timeoutMs: number; fetch?: typeof fetch }): Promise<Fetched<unknown>>` (added to `mellum-check.ts`, uses `AbortSignal.timeout`); `export function parseSubcommand(args: string): { cmd: "on" | "off" | "check" | "learn" | "task"; n?: number; task?: string }` in `mellum-mode.ts`; CLI `node scripts/mellum.mjs check [--host pi|opencode] [--json]` (exit 1 on any `fail`) and `node scripts/mellum.mjs learn …` (Task 5).

- [ ] **Step 1: Write failing tests.** `parseSubcommand`: `""`/`"on"` → on; `"off"`; `"check"`; `"learn"` → `{cmd:"learn", n:10}`; `"learn 25"` → n 25; `"check the export totals"` and `"learn how the cache works"` → task (Review Focus 1). Hook tests with a fake Pi and an injected fetch: activation with the drift fixture warns once with the exact message format and still activates; with a fetch that never resolves, activation completes within 1,500 ms and warns nothing (Review Focus 2); the run record carries `server: {match:false, diffs:[…]}`, and `{match:null, diffs:[]}` when unreadable; `/mellum check` prints `formatFindings` via `ctx.ui.notify` or stdout without a UI and never activates Mode. CLI (`tests/mellum-cli.test.mjs`): spawn `node scripts/mellum.mjs check --json` with `MELLUM_CHECK_FIXTURES=<dir>` (a test-only env var that makes the CLI read the fixture files instead of fetching) and `HOME` at a temp dir holding `pi-models.json`; exit 0 on the match fixture, exit 1 on drift, JSON parses.
- [ ] **Step 2:** Run; fail. Record in Progress.
- [ ] **Step 3: Implement.** The handler uses `parseSubcommand` first. Activation (all three paths) calls `fetchJson(adminBase + "/admin/api/models", {timeoutMs: 1000})` and stores `settingsDiffs` for the span; it does not await longer than the timeout. `scripts/mellum.mjs` builds `CheckInputs` (3,000 ms timeouts), prints `formatFindings` or JSON.
- [ ] **Step 4: README usage.** In "Use it", a **Check your setup** paragraph: `/mellum check` in Pi; `node <package dir>/scripts/mellum.mjs check --host pi|opencode [--json]` for the terminal, OpenCode and Pi Worker (exit 1 on any fail); what it compares (server, model, the measured settings in Model settings, the provider entry); that it never writes and prints the `PUT` to run yourself; and the one-line warning `/mellum` shows on activation when settings drift. Add a Node test that the README names `/mellum check` and `scripts/mellum.mjs check`.
- [ ] **Step 5:** `npm test` green. CHANGELOG "Added": `/mellum check`, the activation warning, the record's `server` field, `scripts/mellum.mjs check`. Commit `feat(check): /mellum check, a warning on activation, and the CLI`.

### Task 4: Learn, pure

**Files:**
- Create: `extensions/mellum-learn.ts`, `tests/mellum-learn.test.mjs`, `tests/fixtures/learn/paul-runs.jsonl`, `tests/fixtures/learn/patterns/*.jsonl`

**Interfaces:**
- Produces:
  - `export function readRecords(text: string): { records: RunLine[]; bad: number; old: number }` (non-JSON lines → `bad`; no `schema` → `old`; `kind` defaults to `"mode"`)
  - `export interface Pattern { id: "test-thrash" | "bent-project" | "false-success" | "long-run" | "servers" | "drift" | "announce-stop"; count: number; message: string; bullets: string[] }`
  - `export interface Report { runs: number; window: { from: string; to: string } | null; skipped: { old: number; bad: number }; patterns: Pattern[]; suggestion: string[] }`
  - `export function learn(records: RunLine[], opts: { cwd: string; n: number }): Report`
  - `export function formatReport(r: Report, cwd: string): string`

- [ ] **Step 1: Fixtures.** `paul-runs.jsonl`: Paul's `~/.pi/agent/mellum-mode-runs.jsonl` (read-only copy), with every absolute path under his home replaced by `/home/user`, and `cwd` values mapped to `/home/user/ac-demo` or `/home/user/scratch`. One `patterns/<id>.jsonl` per pattern with records that fire it and a near-miss that must not: a first test command that passed (`test-thrash`); a `mutates` command on `src/app.py` only (`bent-project`); a reply "tests failed" (`false-success`); 30 requests exactly (`long-run`); `observe.py` and a `--serve-docs` flag inside a word (`servers`); `server.match` null (`drift`); a text-only final turn with `lastCommand` ok (`announce-stop`). Plus one Worker record with `kind:"worker"`, and a file with a truncated last line and a blank line (Review Focus 4).
- [ ] **Step 2: Write failing tests** for each pattern's fire and near-miss, using the spec §3 table's exact message wording; `test-thrash` picks the most frequent passing command; `bent-project`'s `Write only:` lists top-level paths written minus the bent ones; `n` keeps the newest `n`; `cwd` keeps records at or under it; `old`/`bad` counts; Worker record counted; no pattern → `formatReport` says `nothing to fix`; `paul-runs.jsonl` with cwd `/home/user/ac-demo` fires `test-thrash` with `uv run python -m pytest tests` or the command his records show (assert against the fixture's data, computed in the test).
- [ ] **Step 3:** Run; fail. Record in Progress.
- [ ] **Step 4:** Implement with the spec's test-like regex (`pytest`, `node --test`, `npm test`, `uv run .*test`, `make test`) and patterns in table order.
- [ ] **Step 5:** `npm test` green. Commit `feat(learn): name what went wrong in Mode's run records` (no CHANGELOG entry until Task 5).

### Task 5: Learn, wired in, with the confirm-and-write

**Files:**
- Modify: `extensions/mellum-learn.ts` (add `mergeSuggestion`), `extensions/mellum-mode.ts` (`/mellum learn`), `scripts/mellum.mjs` (`learn`), `tests/mellum-learn.test.mjs`, `tests/mellum-mode-hooks.test.mjs`, `tests/mellum-cli.test.mjs`, `CHANGELOG.md`

**Interfaces:**
- Consumes: Task 4 exports, `readProjectFacts` from `extensions/mellum-facts.ts`, Task 3's `parseSubcommand`.
- Produces: `export function mergeSuggestion(agentsMd: string | undefined, bullets: string[]): { text: string; added: string[]; conflicts: string[] }` (`text` is the whole new file content).

- [ ] **Step 1: Write failing tests.** `mergeSuggestion`: no file → `# Project\n\n## Mellum\n\n- …\n`; file without the section → section appended after one blank line, earlier bytes unchanged; file whose `## Mellum` sits between two other `##` sections → missing bullets inserted at the end of that section, everything else byte-identical (Review Focus 3); file without a trailing newline → one added; existing `Test command:` with a different value → listed in `conflicts`, not changed; existing identical bullet → not in `added`. Hook tests: `/mellum learn` with a UI and `confirm` → true writes `AGENTS.md` in a temp cwd; `confirm` → false writes nothing; no UI prints and writes nothing; no suggestion → no confirm call. CLI: `node scripts/mellum.mjs learn --file tests/fixtures/learn/paul-runs.jsonl --n 10` prints the report and never creates `AGENTS.md`; `--json` parses.
- [ ] **Step 2:** Run; fail. Record in Progress.
- [ ] **Step 3: Implement.** `/mellum learn [n]` reads `MELLUM_MODE_RUNS` (or the default path) and, when present, `~/.pi/agent/mellum-worker-runs.jsonl`; prints `formatReport` plus the suggestion and conflicts; with a UI and non-empty `added`, `ctx.ui.confirm("Add these lines to AGENTS.md?", <the lines>)`, and on true writes `mergeSuggestion(...).text`.
- [ ] **Step 4: README usage.** In "Use it", a **Learn from your runs** paragraph: `/mellum learn` and `/mellum learn 25` in Pi (reads the last N Mode runs from the current directory, names the patterns, suggests a `## Mellum` section, asks before writing `AGENTS.md`); `node <package dir>/scripts/mellum.mjs learn [--n 10] [--file <jsonl>] [--json]` (prints only); where the records live and `MELLUM_MODE_RUNS`; that Worker runs join in M.7B. Extend the README test to name `/mellum learn` and `scripts/mellum.mjs learn`.
- [ ] **Step 5:** `npm test` green. CHANGELOG "Added": `/mellum learn` and `scripts/mellum.mjs learn`. Commit `feat(learn): /mellum learn with a suggested ## Mellum section, written only on yes`.

### Task 6: Docs, live read-only checks, roadmap and backlog

**Files:**
- Modify: `README.md` ("Use it": learn and check paragraph), `skills/mellum-setup/reference/07-smoke.md` (ends with the check), `docs/recipe.md` (a "Records, learn and check" section), `ROADMAP.md`, `BACKLOG.md`, `CHANGELOG.md`, this plan

- [ ] **Step 1: Docs.** README: under Task 5's **Learn from your runs** paragraph, a trimmed example (four report lines and the suggestion); reread the whole "Use it" section so check, learn, Model settings and Project facts read as one flow without repeating each other; keep the README's terse style. Smoke step: after the fixture passes, run `node <package dir>/scripts/mellum.mjs check --host <host>` and show its output; Pi users can use `/mellum check`. Recipe section: the record fields `learn` uses, the seven patterns in one table, the check's findings, the activation warning, and that the expected values come from the measured profile.
- [ ] **Step 2: Live checks (read-only HTTP; no model call).** From the worktree: `node scripts/mellum.mjs check --host pi` against Paul's server; record the output in Progress (expect all `settings` ok, since his server is at the measured values). `node scripts/mellum.mjs learn --file ~/.pi/agent/mellum-mode-runs.jsonl --n 10` run from `/Users/pauleveritt/projects/pauleveritt/ac-demo` as cwd; record the output. Do not run `/mellum` or any `pi` command.
- [ ] **Step 3: Roadmap and backlog.** M.7A row: Status with what shipped and the live-check results; add an **M.7B** row ("Worker run records: the Pi guards extension and the OpenCode plugin write `kind: "worker"` records to `~/.pi/agent/mellum-worker-runs.jsonl` (and an OpenCode equivalent) in the schema `learn` reads" / Excludes "any measured change" / "not started"); `## Now`. Backlog: add "Measure a 16,384 ceiling" (spec §4 text, under 1,200 chars, with *Reopens when* Paul schedules it); remove "`/mellum learn`" and "Server and model setup check" (outcome: the M.7A row).
- [ ] **Step 4:** CHANGELOG checkpoint against `git log v0.1.3..HEAD --oneline`. `npm test` and ladder pytest (not slow) green. Progress filled per task with failing-first evidence. Commit `docs: M.7A — learn and check in the README, recipe and setup skill; roadmap and backlog`. Leave `lifecycle: active` for Paul's merge.

## Progress

(Executors append here: task, failing-first evidence, commands and results.)

- **Task 1** (RED): wrote `tests/settings-source.test.mjs` and `ladder/tests/test_settings_source.py` first. `npm test` failed on the missing `templates/omlx-model-settings.json`; the pytest raised FileNotFoundError on it. With the data file added and docs untouched, the Node table rows failed with "max_tokens row reads 16384, expected 4096" and "README lacks | model id | ...".
- **Task 1** (GREEN): data file verbatim from spec section 1; `03-server.md` table and `PUT` and the README Model settings table updated. `npm test`: 138 pass; ladder `pytest -m "not slow"`: 122 pass.
- **Task 2** (RED): wrote `tests/mellum-check.test.mjs` and the fixtures first. `npm test` failed with ERR_MODULE_NOT_FOUND on `extensions/mellum-check.ts`.
- **Task 2** (GREEN): fixtures from three read-only GETs (home paths anonymised, `auth`/aliases dropped); module implemented. `node --test tests/mellum-check.test.mjs`: 23 pass. `npm test`: 161 pass. During the run one test failed on `/maxTokens/` matching `maxTokensField`; fixed the test regex.
- **Task 3** (RED): tests first in `mellum-mode`, `mellum-mode-hooks` (every harness now gets a fake fetch, HOME a temp dir), `mellum-check` (fetchJson, gatherInputs), new `mellum-cli`, and `docs`. `npm test`: 23 fail (parseSubcommand not a function; `scripts/mellum.mjs` MODULE_NOT_FOUND; no warning, no `server` field). The never-resolving-fetch and silent-when-unreachable tests passed vacuously, so each was shown failing against a mutation (no own-timer race: 3 s test timeout; warn on null: fail); the node_modules CLI test fails with ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING when the mirror is disabled.
- **Task 3** (GREEN): `npm test`: 186 pass. No network: fixtures via MELLUM_CHECK_FIXTURES and injected fetches.
- **Task 4** (RED): wrote `tests/mellum-learn.test.mjs` and the fixtures (`paul-runs.jsonl` anonymised, one file per pattern with near-misses, worker, damaged) first. `node --test tests/mellum-learn.test.mjs` failed with ERR_MODULE_NOT_FOUND on `extensions/mellum-learn.ts`.
- **Task 4** (GREEN): `learn`, `readRecords`, `formatReport` implemented; 20 tests pass. Five mutations (`serve` without `\b`, `>=` 30, nested conftest, success claim without the `lastCommand` check, thrash at one run) each failed a named test. The real file's rules per R7: ac-demo fires only `servers`; the scratch runs fire `false-success` and `announce-stop`; `test-thrash` cannot fire (one run). `--serve-docs` does match `\bserve\b` (a hyphen is a boundary), so the near-misses are `observe.py` and `preserve.py`.
- **Task 5** (RED): tests first in `mellum-learn` (mergeSuggestion incl. the section between two others and no trailing newline, compared by exact prefix and suffix; formatMerge, recordFiles, learnFromTexts), `mellum-mode-hooks` (confirm yes/no, no UI, no suggestion, conflict, Worker file, `learn 0`, failed write), `mellum-cli` (learn text/JSON/default sources/usage, and learn from the node_modules mirror) and `docs`. Failures: missing export `formatMerge`; 7 hook tests; 6 CLI tests; the README test.
- **Task 5** (GREEN): `mergeSuggestion` reuses `findMellumSection`/`bulletOf` now exported from mellum-facts; `/mellum learn [n]` and `scripts/mellum.mjs learn` wired; README paragraph. `npm test`: 230 pass. An explicit `--file` that does not exist exits 2; default sources may be missing.
- **Task 6** (RED): six new `tests/docs.test.mjs` assertions first (check CLI per host with no `a|b` in bash fences, the 16,384 sentence, the learn example, the smoke check, recipe 4c, stale 16,384 and forced-thinking docs); `node --test tests/docs.test.mjs`: 6 fail, then 9 pass. Docs: README, recipe 4c, smoke, omlx.md, the two provider notes; ROADMAP M.7A/M.7B/Now, BACKLOG, CHANGELOG.
- **Task 6** (live, read-only): `check --host pi` against Paul's server exited 0, "5 checks ok", one INFO (memory guard ceiling 48, advised 14); `learn` from ac-demo read 1 run (3 old skipped), pattern servers. No `timeout` binary on this Mac; a perl `alarm 30` wrapper stood in. `npm test`: 239 pass; ladder `pytest -m "not slow"`: 122 pass.
- **Final fix wave** (RED): 11 new tests first (wrong-shape records fixture, `Write only:` outside the cwd, "1 run", additive `Do not:` (R8), "runs suggest:" (R9), Suggested block from the merge, re-read after yes, `--file` with no path, README `--host` and M.7B lines, README example vs. real fixture output); 14 fails across learn (7), hooks (2), CLI (3), docs (2) incl. 2 updated old assertions.
- **Final fix wave** (GREEN): `readRecords` normalises fields (drops malformed entries, never the record); merge and report fixes; `runLearn` re-merges after yes. README example regenerated from `scripts/mellum.mjs learn --file` on `patterns/bent-project.jsonl` (layout identical). `npm test`: 250 pass; ladder `pytest -m "not slow"`: 122 pass.
