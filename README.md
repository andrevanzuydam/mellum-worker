# mellum-worker

*Apologies for the slop, I was in a hurry.* 

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
pi install git:github.com/pauleveritt/mellum-worker@v0.1.2
```

Then `/skill:mellum-setup`. The skill walks through weights, the oMLX
server, the provider entry, the agent file, optional delegation rules, and a
smoke test, checking each step and asking before it writes to a file you
own. Mellum Mode is live as soon as the package is installed and the model
is served; Mellum Worker needs pi-subagents too.

OpenCode, in the `plugin` array of `~/.config/opencode/opencode.json` or
`opencode.jsonc`:

```json
{ "plugin": ["mellum-worker@git+https://github.com/pauleveritt/mellum-worker.git#v0.1.2"] }
```

Then ask "run the mellum-setup skill".

## Use it

**Mellum Mode (Pi).** Type `/mellum <task>` in any session. Here's an
example prompt:

```
/mellum Add a hello world file and a unit test that goes with it
```

Pi switches to Mellum with the worker prompt and seven file tools, runs the
task, and switches back when it settles. A task that also names the test
command and the files saves a round trip:

```
/mellum Add hello.py at the repo root with hello() returning "Hello, World!", and tests/test_hello.py that imports it. Test command: uv run --offline python -m pytest -q tests
```

For several tasks in a row, `/mellum on`,
type each task as a normal prompt, then `/mellum off`. Your usual model
then gets one handoff block per span, from `/mellum on` to `/mellum off`
(a one-line summary of requests, output tokens and wall time; files
written, flagged if missing when the handoff is built; the shell commands
run, failed ones marked; the last command's output; Mellum's reply)
instead of every read and edit. When the mode switches off, Pi shows a
one-line count of requests, tool calls, output tokens and seconds. Run
the tests yourself afterwards; nothing else checks Mode's work. Run
`/mellum off` before a long turn with your main model: auto-compaction is
refused while Mode is on.

Each span also appends one JSON line to `~/.pi/agent/mellum-mode-runs.jsonl`
(task, model, working directory, start and end times, requests, token
usage, files, commands with their pass or fail, Mellum's final reply) so
you can analyse runs from another session without parsing transcripts.
Set `MELLUM_MODE_RUNS` to another path, or to `0` to turn it off.
Schema 2 also records files missing at the end, which commands change
files, the shape of the final turn, nudge and guard-block counts, how the
span was activated, the host, and the package and prompt versions.

`pi -p "/mellum <task>"` runs one task headlessly: it waits for Mellum to
finish, switches back, writes the record, and exits.

Mode sends Mellum only the worker prompt and your task. It does not send
your project's AGENTS.md, your earlier conversation, or any skill. If the
project has a test command, a layout rule, or a file it must not touch,
say so in the task.

**Mellum Worker (Pi, needs pi-subagents).** In a normal session say
"Use mellum-worker to do this: the cart total ignores quantity, fix it. Test
command: node --test calculator.test.js." Your model briefs the child, waits,
and runs the tests itself before reporting. If pi-subagents says the child
"produced no output", dispatch it once more with the same brief; in sixty
measured runs that recovered ten of eleven.

**OpenCode.** "Delegate to mellum-worker: …" with the same shape of brief.

**Right-sizing the task.** Mellum passes when the brief is a fact sheet,
not a plan:

- Name the exact file or a literal string to grep for. "The export is
  missing the totals row" works; "look around the reports code" does not.
- Name the test command. Without one the prompt guesses `uv run --offline
  pytest -q` or `node --test <file>`, and a wrong guess costs a round trip
  or ends the run. The guess runs the `pytest` entry point, which does not
  put the project root on `sys.path`; a project whose tests import a root
  module needs `python -m pytest`, a `pythonpath` setting, or a package, and
  Mellum will not know which unless the task says.
- One change per task. Three files that change together is fine (rung 4 and
  5 passed 3/3); two unrelated changes is two tasks.
- Give facts, not steps. A brief that lists numbered steps with "reply
  with…" between them stalls at the first reply (11/15); the same content
  as plain facts passes.
- Keep it out of exploration and design. If you would need to read the
  code to write the brief, do that first with your main model, then hand
  over the result.
- Expect 11 to 14 Mellum requests and 25 to 120 seconds per task on an
  M-series Mac; the long end is three-file changes.

## What you get

| Host | Deliverable | How to use it | Passes | Wall s, mean | Mellum requests per run | Your main model per run |
| --- | --- | --- | --- | --- | --- | --- |
| Pi | Mellum Mode, in your own session | `/mellum <task>`, `/mellum on`, `/mellum off` | 14/15 | 70 | 13.1 | none |
| Pi | Mellum Worker, a pi-subagents child | "Use mellum-worker to ..." | 15/15 | 54 | 11.1 | 6.5 turns, about 3k output and 120k mostly cached input tokens |
| OpenCode | Mellum Worker subagent | "Delegate to mellum-worker ..." | ported, unmeasured | | | |

The ladder is five coding tasks run three times each, in
[mellum-mlx](https://github.com/pauleveritt/mellum-mlx/blob/main/docs/research/ladder/ablation-summary.md),
on an M5 Max through oMLX. The same tasks with Mellum as the primary agent:
8/15 in bare Pi (51 s) and 10/15 in a full Superpowers profile (72 s).
Mode and Worker trade cost for wall time: Mode spends nothing on your main
model and leaves Mellum's tool results in your session; Worker is faster on
multi-file tasks and keeps your session clean, but its parent turns cost
hosted tokens. The recipe's cost section has the per-rung numbers.

## Findings

The research lives in [mellum-mlx](https://github.com/pauleveritt/mellum-mlx);
this repo ships the result. Start with:

- [recipe.md §6](docs/recipe.md#6-what-is-settled-and-what-is-not): what is
  settled by measurement and what is not.
- [recipe.md §4](docs/recipe.md#4-using-mellum-worker-delegated): the recorded
  pathologies (empty final turns, false "fixed" claims, repeated identical
  calls) and the guard that answers each.
- [Ablation summary](https://github.com/pauleveritt/mellum-mlx/blob/main/docs/research/ladder/ablation-summary.md):
  the scoreboard, every setting measured in and out.
- [Where the cost goes](https://github.com/pauleveritt/mellum-mlx/blob/main/docs/research/2026-10-09-worker-cost-options.md):
  Mode versus Worker per task.
- [Recovery report](https://github.com/pauleveritt/mellum-mlx/blob/main/docs/research/mellum-recovery-2026-10-07/report.md):
  why Mellum cannot run a full agent workflow as the primary model, and what
  it can do instead.
- [Future work](https://github.com/pauleveritt/mellum-mlx/blob/main/docs/research/2026-10-09-future-work.md):
  the open experiments, including measuring the OpenCode port.

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
docs/                         recipe, backend guides, and docs/sdd.md for how work is recorded
ROADMAP.md, BACKLOG.md        phases and deferred work with reopen conditions
```

`npm test` runs the suite. `node build.mjs` regenerates the
agent templates after a prompt change.

## Releases

Pin a tag in both install lines. OpenCode treats an unpinned git spec as
"latest" and may refresh it under you. Tags follow semver; the package
version and the tag match, and a test checks it.
