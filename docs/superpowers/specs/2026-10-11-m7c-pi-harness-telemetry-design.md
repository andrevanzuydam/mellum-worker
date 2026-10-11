# M.7C design: trustworthy Pi research traces

Date: 2026-10-11. Phase: M.7C. Design proposed for written review.

## Intent and agreed boundary

Paul chose research-harness-only telemetry and asked that this remain a
small effort, not a satyrn-evals competitor. The agreed approach extends
the existing ladder recorder and runner, rather than adding a sidecar.

Success means we can reconstruct one Pi Mode and one Pi Worker smoke run:
what each agent received, the provider stream Pi observed, tool attempts
and execution, and whether the runner exited or reached its deadline.
Preserve the measured prompt, tools, sampling and guard decisions.

The three deliverables are verified launch, an observational trace, and
compatibility proof. Scoring changes belong to M.7D; execution-policy
experiments belong to M.7E. This phase creates no suite, judge, dashboard,
scheduler, generalized host adapter or recovery policy.

## Existing pieces and source contract

- `ladder/ladder/run_ladder.py` launches Pi in each fixture workspace,
  captures JSON stdout, applies a runner deadline, and writes `run.json`.
- `ladder/ladder/pi_profile.py` prepares isolated or mirrored profiles and
  the delegated Worker definition.
- `ladder/ladder/record-pi.js` currently records `provider_request`,
  `tool_call` and `tool_result`; `score.py` consumes those event types.
- Shipped schema-2 Mode/Worker records and `learn` remain unchanged.

The source of truth for new hooks is Pi's
[v1.1.0 extension types](https://github.com/earendil-works/pi/blob/v1.1.0/packages/coding-agent/src/core/extensions/types.ts),
verified against the matching local tag on 2026-10-11.
`provider_stream_event` exposes parsed provider data before normalization,
not original HTTP bytes. `tool_execution_end.durationMs` is optional and
absent when execution did not occur. `agent_settled.aborted` describes
settlement, not task correctness.

## 1. Verified launch

Add one explicit Pi-executable selection to the existing ladder CLI. Use
the same selected runtime for version checks and launch; record its resolved
path and version. M.7C's research baseline is exactly Pi 1.1.0, installed
in an isolated location. Do not upgrade the global CLI or change the
package's supported Pi minimum.

Before counted runs, verify the fixture environment from the fixture's
working directory: its Python executable and imports required by the fixture.
Launch Pi with that verified environment so bare Python tools use it, rather
than inheriting the ladder's environment. Record the launch command, working
directory and relevant executable identities; do not dump all environment
variables or credentials. A failed preflight stops before a model request.

For delegated runs, ensure the parent and child use the selected runtime and
fixture environment. Record the pi-subagents revision and each observed
instance's runtime identity. A child using another runtime invalidates the
smoke's compatibility claim; the parent's version alone is insufficient.
Use the existing host's launch mechanisms, not a new delegation layer.

## 2. One additive observational trace

Keep `trace.jsonl` and the three existing event types and payload fields.
New event types are ignored by existing scoring. Do not duplicate legacy
events or rewrite their payloads when adding metadata.

Each recorder instance gets an independent UUID, even when instances share
a PID. Each event carries that identity, an instance-local sequence number,
a wall timestamp and a monotonic elapsed timestamp. A runner-generated run
identity groups the files and instances belonging to one ladder attempt.

Assign an instance-local request identity at `before_provider_request` and
associate the following provider stream events with it. Preserve native tool
call IDs on attempts, results and execution events. Associations are based on
observed lifecycle boundaries: do not invent parent/child edges or request
links when the host does not expose enough information. Record ambiguity
explicitly. Do not order different instances by their local monotonic clocks.

Capture only the events needed to reconstruct these runs:

- Provider requests and parsed provider stream chunks, with provider/API/model
  identity and request association.
- Existing tool attempts/results plus execution start/end and optional native
  duration. Keep native parent-tool IDs when present.
- Completed assistant messages, including available native duration, so the
  normalized final can be compared with the provider stream.
- Agent start/end and final settlement, preserving the native abort flag.

Tool attempts without execution remain visible. A blocked call has no
invented execution duration. A started call with no end remains unfinished.
Missing durations or settlement flags in older traces remain unknown, not
zero or false. No parser claims that an empty provider stream proves whether
the model or oMLX caused the empty output.

The runner separately records process exit code or signal, elapsed time,
deadline status and whether settlement was observed. Its deadline evidence
survives termination of Pi. A process exit, an `agent_end`, and final settlement
are distinct observations; none means the task passed. Completed tool durations
must not substitute for the elapsed time of an unfinished call.

## 3. Observation and recording failures

Handlers return no replacement payload, block decision, continuation or
context modification. They do not mutate stream data or tool inputs/results.
Load the recorder after the shipped request-transforming hooks as today.

Recording errors produce a clear stderr diagnostic and do not change the
agent's decisions. The runner marks the attempt's telemetry incomplete on
reported sink errors, malformed records or missing expected instrumentation.
Retain partial evidence; do not fill missing events with guesses or treat
incomplete telemetry as a successful compatibility proof.

Tracing performs local writes only. It adds some overhead; M.7C claims
payload and decision preservation, not identical sampled outputs or timing.
No network exporter or per-chunk model processing is introduced.

## 4. Compatibility and verification

Every new test is shown to fail first. Use the existing Node and pytest
suites; add only coverage for the changed recorder and launch contract.

- Replay a representative retained legacy trace and show its existing score
  is unchanged after adding observational metadata/events. Never overwrite
  historical scores or source evidence.
- Replay a representative Pi 1.1 event sequence and verify identity,
  association, optional durations and settlement. Cover shared-PID instances,
  blocked calls, unfinished execution, abort and runner deadline.
- Compare hooks with recording enabled/disabled on the same deterministic
  inputs: request payloads and guard return values must be identical.
- Verify executable selection and fixture environment, including child
  runtime identity; preflight failure must precede model launch.
- Verify sink failure and malformed/partial evidence are reported honestly.

Live validation is exactly two initial counted smoke attempts: one existing
rung-1 task through Mode and one through delegated Worker, under the shipped
profile and guards. Verify runtime/environment identity, trace reconstruction,
effective request parameters and the existing task checks. These are
instrumentation checks, not a rate or a controlled Pi-version comparison.

If a smoke fails, inspect retained evidence first. Repeat only the affected
smoke after a concrete defect is fixed; do not expand into a campaign. If a
host limitation demands a new subsystem, stop and record the limitation.

## 5. Evidence and closure

Commit the spec, plan, tests, small reviewed replay fixtures and a short
M.7C finding. Replay fixtures may use neutral identifiers and omit sensitive
content, but document the transformation and preserve event relationships.
Raw traces, stdout and patches stay outside Git. Publish reviewed smoke
assets in a research release with hashes and runtime provenance. The existing
October 11 archive manifest remains a historical preservation record;
publication review does not silently rewrite it.

Record exactly what was validated and what remains unknown. Update the
roadmap status and current pointer, close/archive the plan and reconcile
the changelog. Changed ladder commands or records need an Unreleased entry;
SDD records alone do not.

Stop when both smoke runs can be reconstructed, deterministic compatibility
checks pass, and the evidence is retained with provenance. No generalized
analysis tool is required: raw traces and the existing run summary suffice.

## Risks

- Host package discovery can select another Pi runtime for a child; verify
  actual instances rather than trusting launch intent.
- Stream hooks expose parsed data, and observer writes consume time; neither
  raw-wire attribution nor a speed claim is justified.
- Trace files may contain private task/provider data. Review release assets
  and retain hashes for the actual published versions.
- Legacy records lack some lifecycle evidence. Compatibility preserves that
  uncertainty rather than manufacturing a complete history.
