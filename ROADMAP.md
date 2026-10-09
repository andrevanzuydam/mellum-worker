# Roadmap: mellum-worker

Read [`README.md`](README.md) for what ships and [`docs/sdd.md`](docs/sdd.md)
for how work is recorded. Deferred work lives in [`BACKLOG.md`](BACKLOG.md).
One phase at a time; tangents go to the backlog, never into the current phase.

## Now

**Measured:** Pi Mode 14/15 and Pi Worker 15/15 on the ladder in
[mellum-mlx](https://github.com/pauleveritt/mellum-mlx/blob/main/docs/research/ladder/ablation-summary.md).
**Shipped:** M.2 as v0.1.2, see [`CHANGELOG.md`](CHANGELOG.md) and the
[ac-demo finding](docs/superpowers/research/2026-10-09-ac-demo-hello-world-finding.md).
**Active:** M.5: the mellum-worker half is on branch
`m5-print-mode-and-record` (plan
[`2026-10-09-m5-print-mode-and-record.md`](docs/superpowers/plans/2026-10-09-m5-print-mode-and-record.md));
the mellum-mlx half waits on Paul.
**Order:** low-hanging fruit first (M.5, then M.6), then the Worker's cost
(M.7, M.8), then M.3 and M.4.

## Phases

| Phase | Ships | Excludes | Status |
| --- | --- | --- | --- |
| **M.1** | The Git-installable package for Pi and OpenCode: Mellum Mode, Mellum Worker, the `mellum-setup` skill, templates, docs. | Any backend but oMLX; measuring the OpenCode port; OpenCode 2.x. | complete 2026-10-09 — v0.1.0, then v0.1.1 for the OpenCode git-install fix. Spec and plan in mellum-mlx (see `docs/sdd.md`). |
| **M.2** | Handoff that survives shell moves, a per-span summary, and a JSONL run record for analysis from another session. | Changing prompt v5; an OpenCode counterpart. | complete 2026-10-09 — v0.1.2. Found by an ac-demo run where `mv` made the handoff's file list wrong; the rerun on v0.1.2 is the [finding](docs/superpowers/research/2026-10-09-ac-demo-hello-world-finding.md). No plan file: the work predates the SDD scaffold. |
| **M.5** | `pi -p "/mellum <task>"` runs to completion and writes the record (the command handler awaits idle when the host has no UI); run record schema 2 (missing files at end, file-changing commands, final-turn shape, nudge and block counts, activation, host, versions); the ladder in mellum-mlx reads the extension, guards, prompt and template from `--worker-root` and its own copies are deleted; docs. | Any change to the prompt, templates, filter, tools or guard decisions (measured; the prompt experiment is sized in the steering note and stays in the backlog); handoff text; a ladder runner mode that drives `/mellum`; a record consumer; the v0.1.3 tag. | active 2026-10-09 — mellum-worker half done on its branch: one-shot under `pi -p`, schema-2 record, 96 tests, live check passes; not merged. Left: the mellum-mlx `--worker-root` half and its rung-1 smoke (Paul approves the cross-repo change), then close-out and v0.1.3. Ordered first because every later phase measures `extensions/` or the templates through `--worker-root`. Resolves "The ladder measures the repo copy" and "Run-record consumers" at close. |
| **M.6** | Worker one-liners from the [cost note](https://github.com/pauleveritt/mellum-mlx/blob/main/docs/research/2026-10-09-worker-cost-options.md) §2: `async: false` in the agent frontmatter; a description line telling the parent to re-dispatch once on "produced no output"; the setup skill offers pi-subagents' `intercomBridge.mode: off` as an opt-in (A11: child prompt 2,711 → 1,220 chars, prefill −20%, 15/15). | Changing prompt v5; making the intercom setting a default (it is global to every subagent). | not started. Templates are measured, so one delegated ladder phase (15 runs) against A10 through M.5's `--worker-root`. Low-hanging: three small edits and one run. |
| **M.7** | An in-process Worker: a `mellum_worker(task)` tool that runs Mellum through Pi's SDK (`createAgentSession`) inside the parent's process, cost note §3b. The child sees prompt v5 alone; we own the loop, so the nudge and loop breaker work without pi-subagents; the parent's tool schema shrinks to one tool. | Dropping pi-subagents support (the agent file keeps working); Mode changes. | not started. Unverified until a probe: whether an extension's `createAgentSession` can use the oMLX model entry and whether `agent_before_settle` fires for it. Delegated ladder phase against M.6. |
| **M.8** | Mediated brief on a tight leash: `/mellum brief <request>`, where the parent writes a fixed-shape brief (files, test command, constraints), shows it, then runs it under Mode and checks the handoff. Takes the backlog entry "Mediated brief". A Worker-cost play too: it keeps the parent's scoping and checking with no pi-subagents, and should take fewer parent turns than A10's 6.5 (unmeasured). | Free-form rewriting of the request; the parent editing the handoff; any prompt change. | not started. Not a measured setting; compared on the ac-demo phase specs with schema-2 records (loose `/mellum` against mediated), and on the ladder if a runner can drive it. |
| **M.3** | Measure the OpenCode port on the ladder. | Guards or Mode for OpenCode. | not started — needs a `--harness opencode` runner in mellum-mlx, built on M.5's `--worker-root`. |
| **M.4** | Ollama backend: GGUF, Modelfile, tool-call check, provider templates for both hosts, ladder rerun. | Linux GPU backends. | not started — `docs/backends/ollama.md` lists what a port needs. |

## Gates

A phase closes when its plan has `lifecycle: closed` with a `## Result`, the
suite is green, the tag exists, and the README's numbers still match the
ladder records they cite.
