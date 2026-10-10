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

Measured, not guessed: every setting here was ablated by the ladder (`ladder/`),
with records in `docs/ladder/`. The 6-bit weights are on
[Hugging Face](https://huggingface.co/pauleveritt/Mellum2.1-12B-A2.5B-Thinking-mlx-6bit).

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
The file is append-only across upgrades, so lines without a `schema`
field are schema 1.

`pi -p "/mellum <task>"` runs one task headlessly: it waits for Mellum to
finish, switches back, writes the record, and exits.

**Project facts (Mode).** Mode sends Mellum only the worker prompt and
your task: not your earlier conversation, not any skill, and not your
`AGENTS.md`, except one section of it. Without the project's test
command, Mellum guesses the prompt's `uv run --offline pytest -q`, which
cannot import a root `app.py` from tests in `tests/`. In a four-run probe
on loose briefs it then spent 7 to 25 commands bending the project to
that command (`tests/__init__.py`, `pytest.ini`, relative imports,
`pip install .`). On the ladder's AgentClinic rungs with facts off
(12 runs), 11 runs hit that import error, 8 wrote files outside the
project's write-list, 3 were cut at the 600 s deadline, and 1 passed
(rescored under the added-tests rule). The remedy is a `## Mellum`
section in the `AGENTS.md` of the directory you start Pi in: Mode reads
its bullets once per span and appends them, as `Project facts:`, to every
task it sends, so the prompt's "a command named in the task is the
command" rule sees your test command. With the section, 9 of 12 passed,
none wrote outside the write-list, and the median run took 26 requests
(facts off: 50).

```markdown
## Mellum

- Test command: uv run python -m pytest tests
- Write only: app.py, models.py, templates/, tests/
- Do not: install packages or add dependencies; remove or rewrite routes that already work; weaken tests
```

Bullets only; any label is forwarded, and these three are the measured
ones. The section ends at the next `#` or `##` heading, and its bullet
text is capped at 600 characters (over that, Mode warns and ignores the
section). Without the section, or without a `Test command:` bullet, a
project whose `pyproject.toml` mentions pytest gets `Test command: uv run
--offline python -m pytest -q`; Node projects get nothing added.
`MELLUM_MODE_FACTS=0` turns both off. Each span says which source applied
in the session (`[mellum-mode on] facts: agents-md`), in the handoff
summary line and in the run record's `facts` field. `/skill:mellum-setup`
offers to write the section for you (phase 8). Anything else the task
needs, say in the task.

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
- Name the test command, in the task or once in the `## Mellum` section
  (Mode). Without one the prompt guesses `uv run --offline
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
[the ladder](docs/ladder/ablation-summary.md),
on an M5 Max through oMLX (rungs 1–5; the Mode row is Mode without
project facts). The same tasks with Mellum as the primary agent:
8/15 in bare Pi (51 s) and 10/15 in a full Superpowers profile (72 s).
Mode and Worker trade cost for wall time: Mode spends nothing on your main
model and leaves Mellum's tool results in your session; Worker is faster on
multi-file tasks and keeps your session clean, but its parent turns cost
hosted tokens. The recipe's cost section has the per-rung numbers.

Rungs 6–9 build a small FastAPI app (AgentClinic) from four loose phase
specs, one phase per rung, three runs each; a run passes when the
project's tests and hidden behaviour tests pass, no existing test was
removed or edited, and nothing was written outside the `AGENTS.md` file
list. Mellum Mode, 12 runs per column
([research note](docs/superpowers/research/2026-10-09-m7-project-facts.md)):

| Rungs 6–9, per run | facts off ([A18](docs/ladder/ablation-a18-agentclinic-facts-off/README.md)) | `## Mellum` section ([A19](docs/ladder/ablation-a19-facts-on/README.md)) | fallback command only ([A20](docs/ladder/ablation-a20-facts-fallback-only/README.md)) |
| --- | --- | --- | --- |
| passes | 1/12 | 9/12 | 7/12 |
| Mellum requests, median | 50 | 26 | 28 |
| wall s, median | 261 | 106 | 143 |
| output tokens, median | not in `run.json` | not in `run.json` | not in `run.json` |
| runs that wrote outside the file list | 8/12 | 0/12 | 5/12 |
| runs cut at the 600 s deadline | 3/12 | 1/12 | 1/12 |

A18's 1/12 is rescored under the added-tests rule the other two columns
use (0/12 under the strict byte-identical rule it ran with). Wall is the
runner's untrusted clock, with deadline runs counted at 600 s. `run.json`
records requests and wall time per run, not output tokens. With facts on,
rungs 1–5 pass 15/15 (Mode as shipped in v0.1.2: 14/15).

## Findings

The ladder (`ladder/`) and its records (`docs/ladder/`) live in this repo. Start with:

- [recipe.md §6](docs/recipe.md#6-what-is-settled-and-what-is-not): what is
  settled by measurement and what is not.
- [recipe.md §4](docs/recipe.md#4-using-mellum-worker-delegated): the recorded
  pathologies (empty final turns, false "fixed" claims, repeated identical
  calls) and the guard that answers each.
- [Ablation summary](docs/ladder/ablation-summary.md):
  the scoreboard, every setting measured in and out.
- [Where the cost goes](docs/superpowers/research/2026-10-09-worker-cost-options.md):
  Mode versus Worker per task.
- [Recovery report](docs/superpowers/research/2026-10-07-mellum-recovery/report.md):
  why Mellum cannot run a full agent workflow as the primary model, and what
  it can do instead.
- [Future work](docs/superpowers/research/2026-10-09-future-work.md):
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
in the brief overrides them, and Mode names one from the project's
`## Mellum` section or the `python -m pytest` fallback. Full detail: [docs/recipe.md](docs/recipe.md).

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
ladder/, docs/ladder/         the measuring ladder and its phase records
ROADMAP.md, BACKLOG.md        phases and deferred work with reopen conditions
```

`npm test` runs the suite. `node build.mjs` regenerates the
agent templates after a prompt change. `ladder/` measures this checkout. From `ladder/`:
`uv run python -m pytest` for its tests,
`uv run python -m ladder.run_ladder --help` for runs; records in `docs/ladder/`.

## Releases

Pin a tag in both install lines. OpenCode treats an unpinned git spec as
"latest" and may refresh it under you. Tags follow semver; the package
version and the tag match, and a test checks it.
