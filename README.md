# mellum-worker

[JetBrains Mellum 2.1](https://huggingface.co/JetBrains/Mellum2.1-12B-A2.5B-Thinking),
a 12B-A2.5B thinking model, as a bounded coding worker for
[OpenCode](https://opencode.ai) and [Pi](https://pi.dev). It runs locally,
takes a precise brief, edits code, runs the tests until they pass, and
reports. Your main model stays in charge.

Measured, not guessed: every setting here was ablated in the
[mellum-mlx](https://github.com/pauleveritt/mellum-mlx) research repo.

## Install

OpenCode, in `~/.config/opencode/opencode.json`:

```json
{ "plugin": ["mellum-worker@git+https://github.com/pauleveritt/mellum-worker.git#v0.1.0"] }
```

Pi:

```bash
pi install git:github.com/pauleveritt/mellum-worker@v0.1.0
```

Then run the setup skill. In Pi: `/skill:mellum-setup`. In OpenCode: ask
"run the mellum-setup skill". It walks through weights, the oMLX server,
the provider entry, the agent file, optional delegation rules, and a smoke
test, checking each step and asking before it writes to a file you own.

## What you get

| Host | Deliverable | How to use it | Ladder result |
| --- | --- | --- | --- |
| Pi | Mellum Worker, a pi-subagents child | "Use mellum-worker to ..." | 15/15 |
| Pi | Mellum Mode, in your own session | `/mellum <task>`, `/mellum on`, `/mellum off` | 14/15 |
| OpenCode | Mellum Worker subagent | "Delegate to mellum-worker ..." | ported, unmeasured |

The ladder is five coding tasks run three times each, in
[mellum-mlx](https://github.com/pauleveritt/mellum-mlx/blob/main/docs/research/ladder/ablation-summary.md).
Bare Pi with Mellum as the primary agent scored 8/15 on the same tasks.

## Requirements (v1)

- Apple Silicon Mac, [oMLX](https://github.com/jundot/omlx) 0.6.4 or newer, 9.9 GB for the weights
- Node 24 or newer
- Pi 1.0 or newer; Mellum Worker also needs
  [pi-subagents](https://github.com/nicobailon/pi-subagents)
- OpenCode 1.x (1.18 or newer; the V1 plugin API). OpenCode 2.x is not supported yet.

Other backends: see [docs/backends/ollama.md](docs/backends/ollama.md) for
what a port needs. Nothing but oMLX has been run.

## How it works

The worker is a 643-character prompt of facts about the test command, seven
file tools, and, in Pi, two guards: a nudge when a turn ends empty (at most
three) and a loop breaker. The prompt's default test commands are
`uv run --offline pytest -q` for a pyproject with pytest and
`node --test <file>` for a package.json with a test file; a command named
in the brief overrides them. Full detail: [docs/recipe.md](docs/recipe.md).

This package registers nothing at load time. OpenCode loads a one-hook
plugin that makes the skill discoverable; Pi loads Mellum Mode, dormant
until you type `/mellum`. The skill writes the provider, agent, and rules
into your own config files from [templates/](templates/).

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
