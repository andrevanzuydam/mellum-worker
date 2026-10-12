# M.7C: bounded Pi harness telemetry

**What is measured:** verified launch and additive observation on exactly two
existing rung-1 smokes, Mode and Worker, plus deterministic legacy/Pi-1.1 replay
and unchanged shipped guard decisions. [Attempt records and reconstruction](../../ladder/smoke-m7c/README.md)
contain runtime identities, effective parameters and reviewed raw-asset provenance.

**What is conjecture:** reliability or speed improvement, compatibility across
other hosts/tasks, or a new shipped Pi minimum. None is established here.

## Finding

Both attempts passed existing task checks with unchanged tests. Mode made
8 requests and 7 tool executions; Worker made 7 child requests and 6 child
executions. Trace integrity was `ok` with one identified Pi 1.1.0 instance each,
no open executions and native non-aborted settlement. All visible normalized
assistant replies reconstructed exactly from their parsed chunks. Runner exit,
deadline, settlement and task correctness are recorded separately.

Every Mellum request used the measured 16,384 cap, thinking on and sampling
1/0.95/20. The actual Worker executable matched launch intent; pi-subagents
revision was identified. JavaScript fixture preflight passed; Python behavior
is verified deterministically rather than by these JavaScript smokes.

Replay retained the legacy A10 request count (9) and exact score. Injected
stream loss, observer blocking and chunk-as-request scoring each failed its
covering assertion before restoration. Shipped prompt, tools, sampling, guards
and everyday schema-2 records did not change. No new dependency, scorer,
benchmark suite, analysis framework or host adapter was added.

Fixture preflight now removes the inherited ladder virtualenv and its PATH
entry, resolving the backlog environment leak; Python fixtures activate their
own verified environment. Deadline cleanup remains deferred to M.7E.

Two implementation choices preserve existing behavior: invoke the selected
symlink by its absolute name because multicall shims use that name; compare
canonical targets only for runtime provenance. Keep Worker's provider trace
child-only, reading parent lifecycle from existing stdout, so legacy Worker
request scores remain comparable. Parent raw provider payloads remain unavailable.

The reviewed six-file archive was published as `research-2026-10-11`; its
SHA-256 and source commit are in [PROVENANCE](../../ladder/PROVENANCE.md#m7c-telemetry-smokes).
The earlier October 11 preservation manifest was left unchanged. No smoke
rerun or wider campaign was needed. M.7C's instrumentation gate is met;
M.7D is the next phase to brainstorm, without expanding this harness into
an eval product.

## What would falsify this

Any observer-induced payload/decision change, altered legacy replay score,
actual runtime mismatch or missing/corrupt evidence invalidates the corresponding
compatibility claim. A failure on another host path limits generalization;
it does not authorize silent repair of historical scores.

## Risks

Parsed provider hooks cannot assign raw-wire blame to model versus server.
Trace writes add overhead. Missing historical fields remain unknown. Two
smokes establish reconstruction on those paths, not comparative rates;
scorer changes and execution policies remain separate phases.
