# M.7B design: Worker run records (Pi)

Date: 2026-10-11. Builds on M.7A (v0.1.4: `/mellum learn` reads
`kind: "worker"` records from `~/.pi/agent/mellum-worker-runs.jsonl`, a
file nothing writes yet). Decided with Paul in brainstorming, 2026-10-11:

- Pi Worker runs (the pi-subagents child) write schema-2 run records so
  `/mellum learn` and `scripts/mellum.mjs learn` cover them as they cover
  Mode.
- The OpenCode recorder moves to M.3, where the port is first run and
  measured, so it is built against observed runs, not docs alone.
- Approach A: record inside `extensions/mellum-guards.ts`, which loads only
  in the Mellum child (the agent file's `subagentOnlyExtensions`), reusing
  Mode's record code moved to a shared module. The agent template does not
  change.
- Tests replay real child sessions from the archived A10 traces; no model
  call. One live delegated run is optional, when Paul says the GPU is free.

Not a measured change: the guards gain observers only. Their block, nudge
and loop-breaker decisions, the agent template, the prompt, tools and
sampling are unchanged, and a test asserts the decisions are identical with
recording on and off. Ships as v0.1.6.

## 1. Shared record code

`extensions/mellum-record.ts` takes, unchanged, from `extensions/mellum-mode.ts`:
`Msg` and the span types, `spanStats`, `RecordMeta`, `RunRecord`,
`runRecord`, `promptVersionOf`, `PACKAGE_VERSION`. `mellum-mode.ts`
imports them; nothing else in it changes. `RecordMeta` gains `kind?: "mode"
| "worker"` (written into the record; `"mode"` when absent) and `facts` and
`activation` accept `null` and `"worker"`. The path helpers live with the
reader in `extensions/mellum-learn.ts` (`modeRunsFile`) and gain
`workerRunsFile(env, home)`: `MELLUM_WORKER_RUNS` if set (`"0"` →
`undefined`, recording off), else `<home>/.pi/agent/mellum-worker-runs.jsonl`.
`recordFiles` uses it, so `learn` and the writer agree on the path.

Mode's existing record and hook tests pass unchanged after the move; that is
the move's test.

## 2. The recorder in the guards extension

The default export of `extensions/mellum-guards.ts` keeps its three
listeners and their return values, and adds a recorder:

- `context` (child messages: system prompt, the parent's brief, history):
  keep the latest list; returns `undefined`.
- `turn_end`: also append `event.message` and the turn's tool results to the
  turns seen since the last `context`.
- `agent_settled`: build the span from `[...lastContext, ...turnsSince]`.
  Task = the first `user` message's text (the brief); span = every message
  after it; system prompt = the first `system` message, for
  `promptVersionOf`. Write one line with `runRecord(task, span, meta)`,
  `meta = { kind: "worker", activation: "worker", host: ctx.mode ?? "unknown",
  model: ctx.model ? provider/id : "unknown", cwd: process.cwd(), endedAt:
  Date.now(), exists, promptVersion, nudges, guardBlocks, facts: null,
  server }`.
- One line per settled run: a run already written (same task and same last
  message) is not written again, so a nudge continuation that settles twice
  writes once, with the final state.
- `nudges` and `guardBlocks` are counted from the guard set's own decisions
  (the nudge returned a continuation; a guard returned `block`).
- `server`: the same activation-style settings check Mode runs (M.7A
  `fetchJson` of the admin model, 1,000 ms, server-only keys), started at
  the first `context` and awaited at most until `agent_settled`; `null`
  match when unreadable.
- Recording never changes a guard decision and never throws into Pi: any
  error writes one stderr line (`mellum-guards: run record not written:
  <reason>`) and the run carries on. `MELLUM_WORKER_RUNS=0` writes nothing.

## 3. The ladder

`child_env` in `ladder/ladder/run_ladder.py` (used by every mode) sets
`MELLUM_WORKER_RUNS` to `<scratch>/mellum-worker-runs.jsonl`, so neither
delegated runs (the guards load in the child) nor direct runs (the ladder
loads `extensions/mellum-guards.ts` with `-e`) write to the operator's file.
A pytest asserts it for direct, delegated and mode envs.

## 4. Tests

Each new assertion is seen failing first.

- **Hook tests** (`tests/mellum-guards.test.mjs`, a fake Pi): a `context`
  with system prompt and brief, turns with `bash`, `edit`, `write` calls
  and results, a nudge, `agent_settled` → exactly one line with `kind:
  "worker"`, the brief as `task`, requests, files, edits, commands with
  `mutates`, `lastCommand`, `finalTurn`, `nudges` 1, `guardBlocks`; a
  second `agent_settled` after a nudge continuation → still one line, the
  final state; `MELLUM_WORKER_RUNS=0` → no file; an unwritable path → one
  stderr line, no throw; the same event sequence with recording on and off
  → identical return values from every listener.
- **Replay tests** (`tests/mellum-guards-replay.test.mjs`): three A10
  traces (rungs 1, 3 and 5, run r1), trimmed to `provider_request`,
  `tool_call` and `tool_result` events, home paths replaced, plus each
  run's `final.md`, committed under `tests/fixtures/worker/`. A converter
  turns each request's new messages into `turn_end` events and `final.md`
  into the last assistant turn; the record must have `requests` equal to
  the number of `provider_request` events, one command per `bash` call, and
  `files` equal to the `write` and `edit` paths.
- **learn end to end**: `scripts/mellum.mjs learn --file <the replayed
  Worker records> --json` reports them, counted as runs, with `kind`
  `"worker"` preserved.
- **Ladder**: the `child_env` test in §3.

## 5. Docs, roadmap

- README "Learn from your runs": Pi Worker runs included; names
  `MELLUM_WORKER_RUNS` next to `MELLUM_MODE_RUNS`; OpenCode runs join with
  M.3; the README test checks `MELLUM_WORKER_RUNS` and the OpenCode note
  instead of "M.7B".
- `skills/mellum-setup/reference/05-worker-pi.md`: one sentence that Worker
  runs are recorded and `/mellum learn` reads them.
- `docs/recipe.md`: the records section covers both files and which fields
  a Worker record leaves empty (`facts: null`).
- `CHANGELOG.md` `[Unreleased]` entries as each part lands.
- Roadmap: the M.7B row's Status; the M.3 row adds "records OpenCode Worker
  runs (moved from M.7B), built against observed runs".

## 6. Order

1. Move the record code to `extensions/mellum-record.ts`; Mode tests pass
   unchanged.
2. The recorder in the guards extension, with the hook tests.
3. Replay fixtures, replay tests, `learn` end to end.
4. The ladder's `child_env`.
5. Docs, roadmap, changelog.
6. Optional: one delegated rung-1 ladder run with a scratch
   `MELLUM_WORKER_RUNS`, only when Paul says the GPU is free; it does not
   block the merge.

## 7. Excluded

The OpenCode recorder (M.3); any change to guard decisions, the agent
template, prompt, tools or sampling; new `learn` patterns (the "Facts and
learn v2" backlog entry); a ladder phase.

## Risks

- pi-subagents may run the child in a process whose `cwd` or `HOME` differs
  from the parent's; the record uses the child's `process.cwd()`, and
  `learn` filters by cwd, so a child that runs elsewhere would not show up
  under the project. The optional live run checks this.
- The `context` event's shape in a child is assumed to match Mode's; the
  replay tests use the trace payloads, and the live run confirms it.
- `agent_settled` must fire in the child for a record to be written; if a
  child is killed or times out first, no record is written. The record
  only reports runs that end.
