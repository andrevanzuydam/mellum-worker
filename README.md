# mellum-worker

[JetBrains Mellum 2.1](https://huggingface.co/JetBrains/Mellum2.1-12B-A2.5B-Thinking),
a 12B-A2.5B thinking model, as a bounded coding worker for
[Pi](https://pi.dev), with an [OpenCode](https://opencode.ai) port. It runs
locally, takes a precise brief, edits code, runs the tests until they pass,
and reports. Your main model stays in charge.

Two ways to use it in Pi:

- **Mellum Mode**: `/mellum <task>` runs Mellum inside your own session with
  the worker prompt and seven file tools, then hands the session back. No
  parent round trip, no extra packages. `/mellum on` and `/mellum off` keep it
  on across several turns. 14/15 on the ladder.
- **Mellum Worker**: a child agent for
  [pi-subagents](https://github.com/nicobailon/pi-subagents). Your usual model
  stays the parent, briefs the child, and runs the tests itself. 15/15 on the
  ladder.

Measured, not guessed: every setting here was ablated in the
[mellum-mlx](https://github.com/pauleveritt/mellum-mlx) research repo.

## Install

Pi:

```bash
pi install git:github.com/pauleveritt/mellum-worker@v0.1.1
```

Then `/skill:mellum-setup`. The skill walks through weights, the oMLX
server, the provider entry, the agent file, optional delegation rules, and a
smoke test, checking each step and asking before it writes to a file you
own. Mellum Mode is live as soon as the package is installed and the model
is served; Mellum Worker needs pi-subagents too.

OpenCode, in the `plugin` array of `~/.config/opencode/opencode.json` or
`opencode.jsonc`:

```json
{ "plugin": ["mellum-worker@git+https://github.com/pauleveritt/mellum-worker.git#v0.1.1"] }
```

Then ask "run the mellum-setup skill".

## What you get

| Host | Deliverable | How to use it | Ladder result |
| --- | --- | --- | --- |
| Pi | Mellum Mode, in your own session | `/mellum <task>`, `/mellum on`, `/mellum off` | 14/15 |
| Pi | Mellum Worker, a pi-subagents child | "Use mellum-worker to ..." | 15/15 |
| OpenCode | Mellum Worker subagent | "Delegate to mellum-worker ..." | ported, unmeasured |

The ladder is five coding tasks run three times each, in
[mellum-mlx](https://github.com/pauleveritt/mellum-mlx/blob/main/docs/research/ladder/ablation-summary.md).
Bare Pi with Mellum as the primary agent scored 8/15 on the same tasks.
Mode and Worker trade cost for wall time: Mode spends nothing on your main
model and leaves Mellum's tool results in your session; Worker is faster on
multi-file tasks and keeps your session clean, but its parent turns cost
hosted tokens. The recipe's cost section has the per-task numbers.

## Requirements (v1)

- Apple Silicon Mac, [oMLX](https://github.com/jundot/omlx) 0.6.4 or newer, 9.9 GB for the weights
- Node 24 or newer
- Pi 1.0 or newer. Mellum Worker also needs
  [pi-subagents](https://github.com/nicobailon/pi-subagents); Mellum Mode
  does not.
- For the OpenCode port: OpenCode 1.x (1.18 or newer; the V1 plugin API).
  OpenCode 2.x is not supported yet.

Other backends: see [docs/backends/ollama.md](docs/backends/ollama.md) for
what a port needs. Nothing but oMLX has been run.

## How it works

The worker is a 643-character prompt of facts about the test command, seven
file tools, and, in Pi, two guards: a nudge when a turn ends empty (at most
three) and a loop breaker. The prompt's default test commands are
`uv run --offline pytest -q` for a pyproject with pytest and
`node --test <file>` for a package.json with a test file; a command named
in the brief overrides them. Full detail: [docs/recipe.md](docs/recipe.md).

This package registers nothing at load time. Pi loads Mellum Mode, dormant
until you type `/mellum`; OpenCode loads a one-hook plugin that makes the
skill discoverable. The skill writes the provider, agent, and rules into
your own config files from [templates/](templates/).

OpenCode has no Mode and no guards: it lacks the hooks that rewrite the
outgoing request or nudge an empty final turn, so the port is the Worker
only, capped by a step limit, and has not been measured on the ladder.

## Layout

```
prompts/mellum-worker.md      the prompt, single source
extensions/                   Mellum Mode and the child guards (Pi)
opencode/plugin.js            skills-path hook (OpenCode)
skills/mellum-setup/          the guided installer
templates/                    agent files and provider fragments, per host
scripts/                      merge-json and render-agent, used by the skill
docs/                         recipe and backend guides
```

`npm test` runs the suite. `node build.mjs` regenerates the
agent templates after a prompt change.

## Releases

Pin a tag in both install lines. OpenCode treats an unpinned git spec as
"latest" and may refresh it under you. Tags follow semver; the package
version and the tag match, and a test checks it.
