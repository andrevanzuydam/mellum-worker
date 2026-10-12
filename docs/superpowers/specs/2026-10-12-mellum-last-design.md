# `/mellum last` design: the latest run as a Markdown table

Date: 2026-10-12. Decided with Paul in chat (bounded change, approved
design; this records it, no plan). Paul's telemetry prompt after each demo
run ("analyze the last prompt's execution: wall clock, turns, failed turns,
tool calls, etc.") is slow and varies; the run records already hold most of
it, so a command reads them instead, with no model call.

Not a measured change: nothing Mellum sees changes. The handoff text, the
prompt, tools, filter, guards and sampling are untouched.

## 1. Three record fields

`spanStats` in `extensions/mellum-record.ts` gains, and `runRecord` writes:

- `toolCalls`: count per tool name over the span's assistant turns, e.g.
  `{ read: 5, bash: 4, write: 4 }`.
- `toolErrors`: tool results with `isError`, any tool.
- `firstWriteSeconds`: seconds from the span's first assistant turn to the
  first turn that calls `edit` or `write`; absent when none or no
  timestamps.

Schema stays 2; older records lack the fields and show "—". The Worker
recorder calls the same `runRecord`, so Worker records gain them too.

## 2. The command

`/mellum last` in Pi; `node scripts/mellum.mjs last [--file <jsonl>]
[--json]` in a terminal. Both read the files `learn` reads (`recordFiles`,
or only `--file`), keep the records whose `cwd` is the current directory,
and take the newest by `endedAt`. No model call, no write. `--json` prints
that record as stored.

`extensions/mellum-last.ts`: `pickLast(texts, cwd)` and
`formatLast(record)`, the Markdown below.

```markdown
**mellum last**: Mode (one-shot), 2026-10-12 11:21, ac-demo

| Metric | Value |
|---|---|
| Task | Implement Phase 1 of specs/roadmap.md |
| Time | 62 s; first write at 31 s (50%) |
| Turns | 14; ended with text (stop) |
| Tool calls | 16: read 5, bash 4, write 4, ls 2, edit 1 |
| Tool errors | 1 |
| Commands | 1 run, 0 failed, last ok |
| Files | 4: templates/base.html, … |
| Tokens | input 41,200 · cache read 120,300 · output 6,100 |
| Facts | agents-md, 276 chars |
| Server | settings match |
| Guards | 0 nudges, 0 blocks |
| Versions | mellum-worker 0.1.7 · prompt v5 · omlx/… |

| Command | Result |
|---|---|
| `uv run --frozen python -m pytest tests` | ok |

> Mellum's final reply, first 300 characters
```

`Missing` (files written then gone) and `Changed files via bash` rows appear
only when non-empty. Values are escaped for a table cell: `|` becomes `\|`,
newlines become spaces, long values are clipped.

## 3. Showing it in Pi

Pi 1.1.0 renders custom messages as Markdown, and they reach the main model
on its next turn, so a short follow-up question can use the table. `/mellum
last` sends `{ customType: "mellum-last", display: true }`. While Mode is
on it uses a plain notification instead, so the table never enters
Mellum's context (keeping it out otherwise means changing the measured
filter). Without a UI it prints to stdout.

## 4. Errors

No records under the directory: a line naming the directory and the files
read. Recording off (`MELLUM_MODE_RUNS=0` and `MELLUM_WORKER_RUNS=0`): says
so. Bad and old lines are skipped as `learn` skips them. Bare Pi runs
(Mellum as the main model) write no record; the README says so.

## 5. Tests

Each seen failing first: the three `spanStats` fields; `formatLast` for a
new record, an old one (dashes), a Worker record, and a command with `|`;
`pickLast` choosing by cwd and `endedAt`; `parseSubcommand("last")`; the
command's Pi output (custom message; notification while Mode is on); the
CLI with `--file`, `--json` and no runs.

## Excluded

Reading Pi's session files; per-tool timings; thinking text; bare-Pi runs;
any change to what Mellum sees.
