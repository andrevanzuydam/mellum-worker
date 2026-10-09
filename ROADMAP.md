# Roadmap: mellum-worker

Read [`README.md`](README.md) for what ships and [`docs/sdd.md`](docs/sdd.md)
for how work is recorded. Deferred work lives in [`BACKLOG.md`](BACKLOG.md).
One phase at a time; tangents go to the backlog, never into the current phase.

## Now

**Measured:** Pi Mode 14/15 and Pi Worker 15/15 on the ladder in
[mellum-mlx](https://github.com/pauleveritt/mellum-mlx/blob/main/docs/research/ladder/ablation-summary.md).
**Shipped:** M.2 as v0.1.2, see [`CHANGELOG.md`](CHANGELOG.md) and the
[ac-demo finding](docs/superpowers/research/2026-10-09-ac-demo-hello-world-finding.md).
**Active:** M.5, spec at
[`docs/superpowers/specs/2026-10-09-m5-print-mode-and-record-design.md`](docs/superpowers/specs/2026-10-09-m5-print-mode-and-record-design.md);
the verdict on steering through the prompt is in the
[steering note](docs/superpowers/research/2026-10-09-steering-and-next-phase.md).
**Then:** M.3, then M.4.

## Phases

| Phase | Ships | Excludes | Status |
| --- | --- | --- | --- |
| **M.1** | The Git-installable package for Pi and OpenCode: Mellum Mode, Mellum Worker, the `mellum-setup` skill, templates, docs. | Any backend but oMLX; measuring the OpenCode port; OpenCode 2.x. | complete 2026-10-09 — v0.1.0, then v0.1.1 for the OpenCode git-install fix. Spec and plan in mellum-mlx (see `docs/sdd.md`). |
| **M.2** | Handoff that survives shell moves, a per-span summary, and a JSONL run record for analysis from another session. | Changing prompt v5; an OpenCode counterpart. | complete 2026-10-09 — v0.1.2. Found by an ac-demo run where `mv` made the handoff's file list wrong; the rerun on v0.1.2 is the [finding](docs/superpowers/research/2026-10-09-ac-demo-hello-world-finding.md). No plan file: the work predates the SDD scaffold. |
| **M.5** | `pi -p "/mellum <task>"` runs to completion and writes the record (the command handler awaits idle when the host has no UI); run record schema 2 (missing files at end, file-changing commands, final-turn shape, nudge and block counts, activation, host, versions); the ladder in mellum-mlx reads the extension, guards, prompt and template from `--worker-root` and its own copies are deleted; docs. | Any change to the prompt, templates, filter, tools or guard decisions (measured; the prompt experiment is sized in the steering note and stays in the backlog); handoff text; a ladder runner mode that drives `/mellum`; a record consumer; the v0.1.3 tag. | active 2026-10-09 — ordered before M.3 so the OpenCode runner reads from the same root. Resolves the backlog entries "The ladder measures the repo copy" and "Run-record consumers" at close. One rung-1 mode smoke from the checkout, no phase. |
| **M.3** | Measure the OpenCode port on the ladder. | Guards or Mode for OpenCode. | not started — needs a `--harness opencode` runner in mellum-mlx, built on M.5's `--worker-root`. |
| **M.4** | Ollama backend: GGUF, Modelfile, tool-call check, provider templates for both hosts, ladder rerun. | Linux GPU backends. | not started — `docs/backends/ollama.md` lists what a port needs. |

## Gates

A phase closes when its plan has `lifecycle: closed` with a `## Result`, the
suite is green, the tag exists, and the README's numbers still match the
ladder records they cite.
