# Roadmap: mellum-worker

Read [`README.md`](README.md) for what ships and [`docs/sdd.md`](docs/sdd.md)
for how work is recorded. Deferred work lives in [`BACKLOG.md`](BACKLOG.md).
One phase at a time; tangents go to the backlog, never into the current phase.

## Now

**Measured:** Pi Mode 14/15 and Pi Worker 15/15 on rungs 1–5
([records](docs/ladder/ablation-summary.md)); M.7 on AgentClinic rungs 6–9:
facts off 1/12, the `## Mellum` section 9/12, fallback only 7/12
([note](docs/superpowers/research/2026-10-09-m7-project-facts.md)).
**Shipped:** M.2 as v0.1.2, see [`CHANGELOG.md`](CHANGELOG.md).
**Active:** M.7 verdict SHIP on branch `m7-project-facts`; plan
[`2026-10-09-m7-project-facts.md`](docs/superpowers/plans/2026-10-09-m7-project-facts.md)
(left: ac-demo copy, release assets, merge). M.6 closes when the
`research-2026-10-09` release assets exist.
**Next:** M.8 (Worker one-liners), then the Worker's cost (M.9, M.10),
then M.3 and M.4.

## Phases

| Phase | Ships | Excludes | Status |
| --- | --- | --- | --- |
| **M.1** | The Git-installable package for Pi and OpenCode: Mellum Mode, Mellum Worker, the `mellum-setup` skill, templates, docs. | Any backend but oMLX; measuring the OpenCode port; OpenCode 2.x. | complete 2026-10-09 — v0.1.0, then v0.1.1 for the OpenCode git-install fix. Spec and plan were written in the weights repo (see `docs/sdd.md`). |
| **M.2** | Handoff that survives shell moves, a per-span summary, and a JSONL run record for analysis from another session. | Changing prompt v5; an OpenCode counterpart. | complete 2026-10-09 — v0.1.2. Found by an ac-demo run where `mv` made the handoff's file list wrong; the rerun on v0.1.2 is the [finding](docs/superpowers/research/2026-10-09-ac-demo-hello-world-finding.md). No plan file: the work predates the SDD scaffold. |
| **M.5** | `pi -p "/mellum <task>"` runs to completion and writes the record (the command handler awaits idle when the host has no UI); run record schema 2 (missing files at end, file-changing commands, final-turn shape, nudge and block counts, activation, host, versions); docs. | Any change to the prompt, templates, filter, tools or guard decisions (measured; the prompt experiment is sized in the steering note and stays in the backlog); handoff text; a ladder runner mode that drives `/mellum`; a record consumer; the v0.1.3 tag. | complete 2026-10-09 — mellum-worker half merged; the ladder half superseded by M.6. Plan in `plans/archive/`. |
| **M.6** | The ladder (`ladder/`), its fixtures and the phase records (`docs/ladder/`) moved into this repo; raw evidence (`trace.jsonl`, `stdout.txt`, `diff.patch`) as `research-*` release assets, never in git; every reference to the old research repo rewired. The ladder renders the agent from the checkout's own template and loads Mode once, so it measures what ships. | Edits to the old research repo; measured changes (prompt, templates, filter, tools, guards); the v0.1.3 tag. | active 2026-10-09 — moved and wired; smoke passed: rung 1 mode run from this checkout, 7 requests, 1 system message, 7 tools ([record](docs/ladder/smoke-m6-one-repo/)). Plan [`2026-10-09-m6-one-repo.md`](docs/superpowers/plans/2026-10-09-m6-one-repo.md). Left: Paul creates the `research-2026-10-09` release assets, then close. Ordered first because every later phase measures `extensions/` or the templates from `ladder/`. |
| **M.7** | Project facts for Mellum Mode: the bullets of a `## Mellum` section in the project's `AGENTS.md` (at most 600 characters) appended as `Project facts:` to every user message Mode forwards; with no test command and a pytest `pyproject.toml`, `uv run --offline python -m pytest -q`; `MELLUM_MODE_FACTS=0` turns both off; the run record's `facts` field and the handoff name the source. Ladder rungs 6–9 (the four AgentClinic phases from looser specs, hidden tests, write-list scoring) with `--mode-facts` and `--strip-facts-section`. README, recipe §4b, and an optional setup-skill phase. | Any prompt or template change (prompt stays v5); Worker (pi-subagents) behaviour; the write-only guard; the mediated brief; reading anything from `AGENTS.md` beyond the `## Mellum` section; commits in ac-demo; publishing releases. | verdict SHIP 2026-10-10 ([note](docs/superpowers/research/2026-10-09-m7-project-facts.md)). Rungs 6–9, 12 runs each: [A18](docs/ladder/ablation-a18-agentclinic-facts-off/README.md) facts off 1/12 (rescored under the added-tests rule; 0/12 strict), [A19](docs/ladder/ablation-a19-facts-on/README.md) section 9/12, [A20](docs/ladder/ablation-a20-facts-fallback-only/README.md) fallback only 7/12. Median requests 50 → 26 (A20 28); median wall 261 → 106 s (A20 143), untrusted clock; output tokens not in `run.json`. `outside_write_list` 8/12 → 0/12 (A20 5/12). A19 rungs 1–5 15/15 (A17 14/15). Plan [`2026-10-09-m7-project-facts.md`](docs/superpowers/plans/2026-10-09-m7-project-facts.md). Left: ac-demo `specs/loose/` copy, release assets, merge. |
| **M.8** | Worker one-liners from the [cost note](docs/superpowers/research/2026-10-09-worker-cost-options.md) §2: `async: false` in the agent frontmatter; a description line telling the parent to re-dispatch once on "produced no output"; the setup skill offers pi-subagents' `intercomBridge.mode: off` as an opt-in (A11: child prompt 2,711 → 1,220 chars, prefill −20%, 15/15). | Changing prompt v5; making the intercom setting a default (it is global to every subagent). | not started. Templates are measured, so one delegated ladder phase (15 runs) against A10 through `ladder/`. Low-hanging: three small edits and one run. |
| **M.9** | An in-process Worker: a `mellum_worker(task)` tool that runs Mellum through Pi's SDK (`createAgentSession`) inside the parent's process, cost note §3b. The child sees prompt v5 alone; we own the loop, so the nudge and loop breaker work without pi-subagents; the parent's tool schema shrinks to one tool. | Dropping pi-subagents support (the agent file keeps working); Mode changes. | not started. Unverified until a probe: whether an extension's `createAgentSession` can use the oMLX model entry and whether `agent_before_settle` fires for it. Delegated ladder phase against M.8. |
| **M.10** | Mediated brief on a tight leash: `/mellum brief <request>`, where the parent writes a fixed-shape brief (files, test command, constraints), shows it, then runs it under Mode and checks the handoff. Takes the backlog entry "Mediated brief". A Worker-cost play too: it keeps the parent's scoping and checking with no pi-subagents, and should take fewer parent turns than A10's 6.5 (unmeasured). | Free-form rewriting of the request; the parent editing the handoff; any prompt change. | not started. Not a measured setting; compared on the ladder's AgentClinic rungs 6–9 against [A18](docs/ladder/ablation-a18-agentclinic-facts-off/README.md) (loose `/mellum`, facts off) and [A19](docs/ladder/ablation-a19-facts-on/README.md) (the `## Mellum` section), with schema-2 records; needs a runner that can drive it. |
| **M.3** | Measure the OpenCode port on the ladder. | Guards or Mode for OpenCode. | not started — needs a `--harness opencode` runner in `ladder/`. |
| **M.4** | Ollama backend: GGUF, Modelfile, tool-call check, provider templates for both hosts, ladder rerun. | Linux GPU backends. | not started — `docs/backends/ollama.md` lists what a port needs. |

## Gates

A phase closes when its plan has `lifecycle: closed` with a `## Result`, the
suite is green, the tag exists, and the README's numbers still match the
ladder records they cite.
