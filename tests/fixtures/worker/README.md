# Worker replay fixtures

Three real Mellum child sessions from the A10 delegated ladder (`ablation-a10-delegated-v5`, profile
`baseline-delegated-guards`, rungs 1, 3 and 5, run r1), used by `tests/mellum-guards-replay.test.mjs`
and `tests/mellum-cli.test.mjs` to replay a Worker run through the guards extension with no model
and no server.

- `a10-rung{1,3,5}-r1.trace.jsonl`: the archived `trace.jsonl` (from `ablation-a10-delegated-v5.tar.gz`
  in the research archive), cut to `provider_request`, `tool_call` and `tool_result` lines. Each
  `provider_request` keeps only `payload.model`, `payload.max_tokens` and `payload.messages` (the
  tools list and sampling parameters are dropped). The trace is the child's only: 9, 14 and 16
  requests. Absolute temp paths (`/private/var/folders/.../ladder-xxxx`) became `/home/user`; the
  messages and results are otherwise as recorded.
- `a10-rung{1,3,5}-r1.final.md`: copied unchanged from `docs/ladder/ablation-a10-delegated-v5/<run>/final.md`
  (no absolute home paths appear in them, so nothing was replaced). It is the ladder's `final_text`,
  the PARENT's report on the run, not Mellum's last turn; the trace holds requests, not responses.
  The replay uses it only to close the request count (one more assistant turn after the last traced
  request), so a replayed record's `finalReply` is the parent's text, and the `startsWith(final.md)`
  assertion only checks that this last turn is carried through to the record.

The converter is `tests/helpers/worker-replay.mjs`. The records a replay writes carry the test's own
`cwd`, `host: "json"` and `server: {match: null, diffs: []}` (the fake fetch rejects), and
`promptVersion: "v5"` (the marker sits after the pi-subagents preamble in the archived system message).
