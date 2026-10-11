# M.7A design: `/mellum learn` and the setup check

Date: 2026-10-11. Builds on M.7 (v0.1.3: project facts, schema-2 records).
Decided with Paul in brainstorming, 2026-10-10 and 2026-10-11:

- Users should learn what went wrong in their runs, and how to fix it,
  without finding or analysing telemetry. They should also learn when the
  oMLX server's settings drifted, since other clients of the same model
  (an eval harness, the ladder) can change them silently.
- Scope: the setup check for all three hosts and `/mellum learn` over
  Mode's records. Worker run records (Pi child, OpenCode) are M.7B; this
  phase fixes the record contract they will write to.
- Deterministic analysis, no model call. `learn` reports, then asks yes/no
  before editing `AGENTS.md`; with no UI it only prints. Nothing writes to
  the server.
- One source of expected settings: the measured ladder profile
  (`baseline`), not the 16,384 / forced-thinking values the setup skill
  wrote until now. A 16,384 ceiling is a backlog ladder phase.
- Approach: shared rule-based modules with thin front ends (`/mellum
  learn|check` in Mode, `scripts/mellum.mjs` for terminal, OpenCode and
  Pi Worker).

Not a measured change: nothing alters Mellum's request path. The setup
skill's new values align what ships with what was measured.

**Correction, 2026-10-11 (fix wave).** The Evidence below is wrong about
the cap. The archived A10, A17 and A19 traces show every Mode and Worker
request (so A14 and A18–A20 too) sent `max_tokens` 16,384,
`chat_template_kwargs` with thinking on, and sampling 1 / 0.95 / 20; oMLX
gives request values precedence, so the `baseline` profile's 4,096 and
unforced thinking never applied. Only direct-mode phases (A3 and earlier)
ran at 4,096. What changed: `model` in the data file splits into
`serverOnly` (`max_context_window`, `turboquant_kv_enabled`: the `settings`
fail, the activation warning and the record's `server`) and `overridden`
(`max_tokens` 16384, `forced_ct_kwargs` `["enable_thinking"]`, thinking,
penalties: info, "overridden by the client's request values"); the ladder
test ties only the server-only keys to `baseline`. The `provider` finding
fails on a different `maxTokens` or sampling value. Step 3 keeps 16,384 and
forced thinking. The backlog entry "Measure a 16,384 ceiling" is withdrawn.
The sections below are left as written.

## Evidence

- Paul's server on 2026-10-10 had `max_tokens` 4096 and
  `forced_ct_kwargs` null after a satyrn-evals run, while the setup skill
  said 16384 and `["enable_thinking"]`; nothing warned.
- Every ladder phase behind the README's numbers (A10, A14, A17–A20) ran
  with `--profile baseline`: `max_tokens` 4096, `forced_ct_kwargs` null.
  Over 100 runs, one ended on `length` (A18, facts off). The only recorded
  cut-off at 4,096 is from phase 1c/1d (prompt v3, greedy, direct).
- The test-command thrash and project-bending patterns `learn` names are
  the ones measured in M.7 (A18: 11 import errors, 8 runs outside the
  write list) and the phase-1 probe (7 to 25 commands).

## 1. One source of expected settings

`templates/omlx-model-settings.json`:

```json
{
  "modelId": "Mellum2.1-12B-A2.5B-Thinking-6bit",
  "model": {
    "max_context_window": 56000, "max_tokens": 4096,
    "thinking_budget_enabled": false, "thinking_budget_tokens": null,
    "presence_penalty": 0.0, "repetition_penalty": 1.0,
    "max_tool_result_tokens": null, "chat_template_kwargs": null,
    "forced_ct_kwargs": null, "turboquant_kv_enabled": false,
    "enable_thinking": true
  },
  "global": { "scheduler.max_concurrent_requests": 1, "cache.hot_cache_max_size": "0" },
  "advice": { "memory.memory_guard_custom_ceiling_gb": 14 }
}
```

- A ladder test asserts `model` minus `turboquant_kv_enabled` and
  `enable_thinking` (server defaults the ladder never sets) equals
  `ladder/ladder/omlx_profiles.py` `PROFILES["baseline"]`, so what ships and
  what is measured cannot drift apart.
- A Node test asserts the setup skill's step-3 table and its `PUT` body
  carry exactly these model values.
- Sampling (1 / 0.95 / 20) is checked against the host provider template
  (`templates/pi/models.omlx.json`, `templates/opencode/provider.omlx.json`),
  which already carries it.
- `skills/mellum-setup/reference/03-server.md`: the table and `PUT` change
  to these values; the `max_tokens` row says 4,096 is what every published
  number used, and that 16,384 is untested on the current recipe.

## 2. The check

`extensions/mellum-check.ts`, pure: `checkSetup(inputs, expected) ->
Finding[]`, where `inputs` holds what was fetched or read (`models` from
`/v1/models`, `adminModel` from `/admin/api/models`, `global` from
`/admin/api/global-settings`, `provider` from the host config, each
possibly an error) and a `Finding` is `{ id, level: "ok" | "info" | "warn"
| "fail", message, fix? }`. Fetching and reading live in the front ends.

| id | Check | Level when wrong | Fix shown |
| --- | --- | --- | --- |
| `server` | `GET <baseUrl>/models` answers | fail | start oMLX (step 3) |
| `model` | `modelId` is listed | fail | weights path (step 2) |
| `settings` | each `model` key equals the data file | fail, one line per key | the exact `PUT` command, never run |
| `global` | each `global` key equals the data file | warn | the admin page URL |
| `advice` | `advice` keys | info | — |
| `provider` | the host's provider entry: `baseUrl`, `contextWindow`, `maxTokens`, sampling, compat equal the template | fail (missing), warn (differs) | setup step 4 |
| `admin` | admin API unreachable, 401 or 403 | warn: "settings not readable" | `http://127.0.0.1:8001/admin` |

`baseUrl` comes from the host's provider entry (Pi `~/.pi/agent/models.json`
provider `omlx`; OpenCode `~/.config/opencode/opencode.json(c)`), default
`http://127.0.0.1:8001/v1`; admin URLs strip the trailing `/v1`.

Front ends:

- `/mellum check` (Pi): prints findings, fails first; `ok` lines
  collapsed into one count.
- `node scripts/mellum.mjs check [--host pi|opencode] [--json]`: same
  text, or JSON; exit 1 on any `fail`.
- On activation (`/mellum`, `/mellum on`, `MELLUM_MODE=1`), Mode fetches
  `adminModel` only, timeout 1 s, and runs the `settings` check. Mismatch:
  one warning line (`Mellum server settings differ: max_tokens 16384
  (expected 4096). Run /mellum check.`), via the existing `warn` helper
  (UI, or stderr without one). Unreachable: silent. It never blocks or
  delays activation beyond the timeout.
- Run record (schema 2, new optional field): `server: { match: boolean |
  null, diffs: { key, expected, actual }[] }`; `null` when unreadable.

Tests (`tests/mellum-check.test.mjs`), each assertion seen failing first:
fixtures recorded from Paul's server (current state, matching the data
file) and a drifted copy (`max_tokens` 16384, `forced_ct_kwargs`
`["enable_thinking"]`, TurboQuant on); a 401 admin response; an
unreachable server; a Pi `models.json` missing the `omlx` provider; an
OpenCode JSONC config with comments. Mode hook tests: the activation
warning text, silence on unreachable, the record's `server` field.

## 3. Learn

`extensions/mellum-learn.ts`, pure: `learn(records, opts) -> Report`, with
`Report = { runs, window, skipped, patterns: Pattern[], suggestion?:
FactsSuggestion }`. Reading the file and writing `AGENTS.md` live in the
front ends.

### Records it reads

Schema-2 lines whose `cwd` equals the current directory or lies under it,
newest first, the last `n` (default 10). Records without `schema` are
skipped and counted. `kind` (new, optional): `"mode"` when absent; M.7B's
Worker records carry `"worker"` with the same fields, written to
`~/.pi/agent/mellum-worker-runs.jsonl`, which `learn` also reads when
present. One fixture test pins this contract with a hand-written Worker
record.

### Patterns (each fires only when its count is at least 1, unless noted)

| id | Fires when | Wording | Remedy |
| --- | --- | --- | --- |
| `test-thrash` | in ≥ 2 runs, the first test-like command failed and a different test-like command later passed | "Test command guessed wrong in N of M runs (median K commands before one passed). The command that passed: C" | `Test command: C`, C = the passing command seen most often |
| `bent-project` | a recorded file or a `mutates` command touches `__init__.py`, `pytest.ini`, `setup.cfg`, `conftest.py` at the root, `pyproject.toml` or `uv.lock`, or a command matches `pip install`, `uv add`, `uv pip` | "Project bent to fit in N runs: <files>; <commands>" | `Write only:` (top-level paths the runs wrote, minus the bent ones) and `Do not: install packages or add dependencies` |
| `false-success` | `lastCommand` ≠ `ok` and the final reply matches `/\b(pass(es|ed)?|success(ful(ly)?)?|complete[d]?|done)\b/i` | "Success claimed after a failed last command in N runs (<dates>). Run the tests yourself before trusting the reply." | none |
| `long-run` | `requests` > 30 | "N runs took more than 30 requests (max R). Split the task: see README, Right-sizing." | none |
| `servers` | a command matches `&\s*$`, `\buvicorn\b`, `\bserve\b`, `runserver` | "Mellum started a server in N runs." | `Do not: start servers` |
| `drift` | `server.match === false` | "Server settings differed in N runs: <keys>. Run /mellum check." | none |
| `announce-stop` | `finalTurn.hadText && !finalTurn.hadToolCall` and `lastCommand` ≠ `ok` | "N runs ended announcing a step without taking it." | none (counts toward the backlog nudge entry) |

A test-like command is one matching `pytest`, `node --test`, `npm test`,
`uv run .*test`, `make test`. Patterns are listed in the table's order.
With no pattern, `learn` prints the run count and "nothing to fix".

### The suggestion and the write

The remedies' bullets merge into one `## Mellum` suggestion. If the
project's `AGENTS.md` already has the section (parsed with
`readProjectFacts`), only missing labels are suggested, and a different
existing value is shown as a conflict ("your Test command: X; runs passed
with: Y"), never rewritten.

- `/mellum learn [n]` (Pi): prints the report and the suggestion; with a
  UI, `ctx.ui.confirm("Add these lines to AGENTS.md?")`; on yes, appends
  the section (or the missing bullets under the existing heading) to
  `AGENTS.md` in the current directory, creating the file if absent; on no
  or without a UI, writes nothing.
- `node scripts/mellum.mjs learn [--n 10] [--file <jsonl>] [--json]`:
  prints only; never writes.

Tests (`tests/mellum-learn.test.mjs`): Paul's 7 real records (paths
replaced, committed as a fixture) and one hand-made record set per
pattern, each with a near-miss that must not fire (a first test command
that passed; a reply saying "failed"; a `serve` inside a word); the merge
with an existing section; the conflict line; `n` and `cwd` filtering; the
schema-1 skip count; the Worker-record contract.

## 4. Docs and records

- README "Use it": a `/mellum learn` and `/mellum check` paragraph with a
  trimmed example, and a **Model settings** paragraph whose table is
  generated from the data file (a test compares them): model id, context
  56,000, generation ceiling 4,096, thinking on, sampling 1 / 0.95 / 20, one
  concurrent request, hot cache off; other clients can change these, and
  `/mellum check` shows drift. Lands in the same commit as the step-3
  change.
- Setup skill: step 3 as §1; the last step (smoke) ends by running
  `scripts/mellum.mjs check` for the host.
- `docs/recipe.md`: a section on the record, `learn`, and the check.
- `CHANGELOG.md` `[Unreleased]` entries as each part lands.
- Roadmap: M.7A row filled; an M.7B row (Worker run records feeding
  `learn`); `## Now`.
- Backlog: add "Measure a 16,384 ceiling" (A19's command at the `tuned`
  ceiling on rungs 4–9, counting mid-run `length` stops from the traces;
  reopens when Paul schedules it); at close remove "`/mellum learn`" and
  "Server and model setup check".

## 5. Order

1. Data file, its two sync tests, step-3 values.
2. Check: module, `scripts/mellum.mjs check`, `/mellum check`, the
   activation warning, the record's `server` field.
3. Learn: module, `scripts/mellum.mjs learn`, `/mellum learn` with the
   confirm-and-write.
4. Docs; read-only live checks (`/mellum check` against Paul's server and
   `learn` over his run log, via the script; no model call, no GPU);
   roadmap and backlog.

2 and 3 share only the record reader; either can be reviewed alone.

## 6. Excluded

Writing to the oMLX server; any model call; Worker record writers (M.7B);
changing the prompt, filter, tools, sampling or guards; a ladder phase;
`learn` thresholds tuned from more data than Paul's records and the
fixtures.

## Risks

- The admin API is oMLX's, not a stable public contract; the check
  reports "not readable" rather than failing when its shape changes, and
  the fixtures pin the shape seen on 0.6.4+.
- Rule thresholds (≥ 2 runs, 30 requests) are judgement on little data;
  each pattern's message states its count so users can judge.
- Appending to a user's `AGENTS.md` is a write to their project; it happens
  only on an explicit yes, adds lines, and never edits existing ones.
- The reply-matching regex for `false-success` will miss some phrasings and
  catch some negations; the message cites the runs so users can look.
