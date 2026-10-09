# Roadmap: mellum-worker

Read [`README.md`](README.md) for what ships and [`docs/sdd.md`](docs/sdd.md)
for how work is recorded. Deferred work lives in [`BACKLOG.md`](BACKLOG.md).
One phase at a time; tangents go to the backlog, never into the current phase.

## Now

**Measured:** Pi Mode 14/15 and Pi Worker 15/15 on the ladder in
[mellum-mlx](https://github.com/pauleveritt/mellum-mlx/blob/main/docs/research/ladder/ablation-summary.md).
**Active:** M.2, the handoff and run-record release (v0.1.2), see
[`CHANGELOG.md`](CHANGELOG.md).

## Phases

| Phase | Ships | Excludes | Status |
| --- | --- | --- | --- |
| **M.1** | The Git-installable package for Pi and OpenCode: Mellum Mode, Mellum Worker, the `mellum-setup` skill, templates, docs. | Any backend but oMLX; measuring the OpenCode port; OpenCode 2.x. | complete 2026-10-09 — v0.1.0, then v0.1.1 for the OpenCode git-install fix. Spec and plan in mellum-mlx (see `docs/sdd.md`). |
| **M.2** | Handoff that survives shell moves, a per-span summary, and a JSONL run record for analysis from another session. | Changing prompt v5; an OpenCode counterpart. | active — found by an ac-demo run on 2026-10-09 where `mv` made the handoff's file list wrong. |
| **M.3** | Measure the OpenCode port on the ladder. | Guards or Mode for OpenCode. | not started — needs a `--harness opencode` runner in mellum-mlx. |
| **M.4** | Ollama backend: GGUF, Modelfile, tool-call check, provider templates for both hosts, ladder rerun. | Linux GPU backends. | not started — `docs/backends/ollama.md` lists what a port needs. |

## Gates

A phase closes when its plan has `lifecycle: closed` with a `## Result`, the
suite is green, the tag exists, and the README's numbers still match the
ladder records they cite.
