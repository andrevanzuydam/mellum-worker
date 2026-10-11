# mellum-worker

*Apologies for the slop, I was in a hurry.* 

[JetBrains Mellum 2.1](https://huggingface.co/JetBrains/Mellum2.1-12B-A2.5B-Thinking),
a 12B-A2.5B thinking model, as a local, bounded coding worker for
[Pi](https://pi.dev), with an [OpenCode](https://opencode.ai) port. It takes
a precise brief, edits code, runs the tests until they pass, and reports.
Your main model stays in charge.

- **Mellum Mode** (Pi): `/mellum <task>` runs Mellum inside your session
  with the worker prompt and seven file tools, then hands the session back.
  No extra packages. 15/15 on the ladder with project facts.
- **Mellum Worker**: a [pi-subagents](https://github.com/nicobailon/pi-subagents)
  child. Your model briefs it and runs the tests itself. 15/15.

Every setting was measured by the ladder (`ladder/`; records in
`docs/ladder/`). The 6-bit MLX weights (for Apple Silicon, served by oMLX)
are on [Hugging Face](https://huggingface.co/pauleveritt/Mellum2.1-12B-A2.5B-Thinking-mlx-6bit).

## Install

Pi:

```bash
pi install git:github.com/pauleveritt/mellum-worker@v0.1.4
```

Then `/skill:mellum-setup`: weights, oMLX server, provider entry, agent
file, optional rules, smoke test. It checks each step and asks before
writing to your files. Mode works once the model is served; Worker also
needs pi-subagents.

OpenCode, in the `plugin` array of `~/.config/opencode/opencode.json(c)`:

```json
{ "plugin": ["mellum-worker@git+https://github.com/pauleveritt/mellum-worker.git#v0.1.4"] }
```

Then ask "run the mellum-setup skill".

## Use it

**Mellum Mode (Pi).** Type `/mellum <task>`:

```
/mellum Add hello.py at the repo root with hello() returning "Hello, World!", and tests/test_hello.py that imports it. Test command: uv run --offline python -m pytest -q tests
```

Pi switches to Mellum, runs the task, and switches back. For several tasks,
`/mellum on`, type them as normal prompts, then `/mellum off`; your model
gets one handoff block per span (summary line, files written, commands run,
last output, Mellum's reply) instead of every edit. Run the tests yourself
afterwards. Run `/mellum off` before a long main-model turn: auto-compaction
is refused while Mode is on. `pi -p "/mellum <task>"` runs one task
headlessly.

Each span appends a JSON line to `~/.pi/agent/mellum-mode-runs.jsonl`
(task, times, requests, tokens, files, commands with pass or fail, final
reply; schema 2 adds missing files, file-changing commands, final-turn
shape, guard counts, host and versions; `server` records whether the oMLX
settings matched). `MELLUM_MODE_RUNS` sets the path; `0` turns it off.

**Project facts (Mode).** Mode sends Mellum only the worker prompt and
your task, never your conversation, skills or `AGENTS.md`, except one
section. Without the test command Mellum guesses one and bends the project
to fit ([What helped](#what-helped)). Add a `## Mellum` section to the
`AGENTS.md` where you start Pi:

```markdown
## Mellum

- Test command: uv run python -m pytest tests
- Do not: install packages or add dependencies; add files at the project root; weaken tests
```

The measured section (A19) also had `- Write only: app.py, models.py,
templates/, tests/`; add a line like it if you want a strict boundary.
The section above without it is not measured yet (backlog: A21).

Mode appends these bullets to every task as `Project facts:`. Bullets only,
600 characters at most; write the label exactly as `Test command:` in plain
text. Without the section, a pytest project gets `Test command: uv run
--offline python -m pytest -q`. `MELLUM_MODE_FACTS=0` turns both off; the
handoff and run record say which applied. `/skill:mellum-setup` phase 8
writes the section for you.

**Mellum Worker (Pi).** "Use mellum-worker to do this: the cart total
ignores quantity, fix it. Test command: node --test calculator.test.js."
If pi-subagents says the child "produced no output", dispatch it once more
(that recovered ten of eleven in sixty runs).

**OpenCode.** "Delegate to mellum-worker: …" with the same kind of brief.

**Right-sizing the task.** Mellum passes on fact sheets, not plans:

- Name the exact file or a literal string to grep for.
- Name the test command, in the task or the `## Mellum` section.
- One change per task; three files that change together is fine.
- Facts, not numbered steps: steps with "reply with…" stall (11/15).
- Do the exploration with your main model first, then hand over the result.
- Expect 11 to 14 requests and 25 to 120 seconds per task.

**Model settings.** The measured runs used these values:

| setting | value | set by |
| --- | --- | --- |
| model id | Mellum2.1-12B-A2.5B-Thinking-6bit | server |
| max_tokens | 16,384 | provider entry, per request |
| thinking | on | provider entry, per request |
| sampling | 1 / 0.95 / 20 | provider entry, per request |
| context window | 56,000 | server only |
| TurboQuant | off | server only |
| thinking budget | off | server only |
| tool-result cap | none | server only |
| concurrent requests | 1 | server only |
| hot cache | off | server only |

Pi sends the first three from its provider entry per request, and oMLX
honours them over the server's own values; OpenCode's template sets only
the output limit, so for OpenCode the server's thinking and sampling apply.
With `force_sampling` on in oMLX, the server's sampling wins over any
request, so `/mellum check` fails unless it is 1 / 0.95 / 20. The
server-only values bind every client, and other clients of the same oMLX
model can change them.

**Check your setup.** In Pi Mode, `/mellum check`. From the terminal,
`--host pi` checks the setup Pi Mode and Pi Worker share, and
`--host opencode` checks OpenCode's (`--json` for JSON):

```bash
node <package dir>/scripts/mellum.mjs check --host pi
node <package dir>/scripts/mellum.mjs check --host opencode
```

`<package dir>` is `~/.pi/agent/git/github.com/pauleveritt/mellum-worker`
(Pi) or `~/.cache/opencode/packages/*/node_modules/mellum-worker`
(OpenCode). It checks that the server answers and lists the model, that the
settings no request can undo match (the server-only rows above, thinking
not forced off, and forced sampling at 1 / 0.95 / 20), and that your
provider entry matches the template, `maxTokens` and sampling included; a
server value your requests override shows as info. Fails print first, and
the CLI exits 1 on any fail. It only reads: a settings fix prints as the
`PUT` to run yourself. Each `/mellum` activation also reads the settings no
request can undo (one second at most) and warns in one line on drift:

```
Mellum server settings differ: max_context_window 32768 (expected 56000). Run /mellum check.
```

**Learn from your runs.** In Pi Mode, `/mellum learn` (the last 10 runs)
or `/mellum learn 25`. It reads the run records for the current directory,
names what went wrong (a guessed test command, a bent project, success
claimed after a failed command, long runs, servers, settings drift), and
suggests the `## Mellum` lines your `AGENTS.md` lacks. Its output on the
test fixture `tests/fixtures/learn/patterns/bent-project.jsonl`:

```
mellum learn: 4 runs in /home/user/proj (2026-10-01 to 2026-10-04)

- Project bent to fit in 3 runs: conftest.py, pyproject.toml, src/__init__.py; uv add httpx

Suggested for AGENTS.md:

## Mellum
- Do not: install packages or add dependencies; add files at the project root; add __init__.py files
```

It asks before adding those lines to `AGENTS.md` and never rewrites a line
you have: a different value prints as a conflict, missing `Do not:` values
go in a new bullet, and it never takes the section past 600 characters.
From the terminal, run it from the project directory; it only prints:

```bash
node <package dir>/scripts/mellum.mjs learn [--n 10] [--file <jsonl>] [--json]
```

Records come from `MELLUM_MODE_RUNS` (default
`~/.pi/agent/mellum-mode-runs.jsonl`) and
`~/.pi/agent/mellum-worker-runs.jsonl`; `--file` reads one file instead.
Only Pi Mode writes records today. Pi Worker and OpenCode records join in
M.7B; until then `learn` in an OpenCode project finds 0 runs.

## What you get

Rungs 1–5, five coding tasks, three runs each, on an M5 Max through oMLX
([summary](docs/ladder/ablation-summary.md)):

| Host | Deliverable | Use | Passes | Wall s, mean | Requests per run | Your main model per run |
| --- | --- | --- | --- | --- | --- | --- |
| Pi | Mellum Mode | `/mellum <task>` | 14/15 (15/15 with facts) | 70 | 13.1 | none |
| Pi | Mellum Worker | "Use mellum-worker to ..." | 15/15 | 54 | 11.1 | 6.5 turns, ~3k output and 120k mostly cached input tokens |
| OpenCode | Worker subagent | "Delegate to mellum-worker ..." | ported, unmeasured | | | |

Mellum as the primary agent: 8/15 in bare Pi (51 s), 10/15 in a full
Superpowers profile (72 s). Mode costs your main model nothing; Worker is
faster on multi-file tasks and keeps your session clean.

Rungs 6–9 build a small FastAPI app (AgentClinic) from four loose phase
specs. A run passes when the project's tests and hidden behaviour tests
pass, no existing test was removed or edited, and nothing was written
outside the file list. Mode, 12 runs each
([note](docs/superpowers/research/2026-10-09-m7-project-facts.md)): facts
off ([A18](docs/ladder/ablation-a18-agentclinic-facts-off/README.md)), a
`## Mellum` section ([A19](docs/ladder/ablation-a19-facts-on/README.md)),
and the fallback only
([A20](docs/ladder/ablation-a20-facts-fallback-only/README.md)). Passes,
requests, time and stray writes are in What helped, below; runs cut at the
600 s deadline were 3, 1 and 1 of 12.

A18 is rescored under the added-tests rule (0/12 strict). Time is the
runner's clock; output tokens are not in `run.json`. Mode and Worker
requests sent max_tokens 16,384 (verified in the A10, A17 and A19 traces);
direct-mode research phases used 4,096.

## What helped

One change made most of the difference: telling Mellum the project's test
command. On less-specified tasks Mellum guesses `pytest -q`, which cannot
import a root module from `tests/`, and then bends the project to fit
(`__init__.py`, `pytest.ini`, `uv add`) until it times out or leaves stray
files. The `## Mellum` section fixes that; without it, Mode's `python -m
pytest` fallback gets about three-quarters of the gain.

| AgentClinic, 12 runs each | no facts | fallback only | `## Mellum` section |
| --- | --- | --- | --- |
| passed | 1 | 7 | 9 |
| requests, median | 50 | 28 | 26 |
| seconds, median | 261 | 143 | 106 |
| wrote outside the layout | 8 | 5 | 0 |

Rungs 1–5 did not regress (15/15). Caveats: three runs per task, one
machine, one kind of project; the baseline is Mode without facts, since bare
Pi was not run on these rungs.

## Findings

- [recipe.md §6](docs/recipe.md#6-what-is-settled-and-what-is-not): what is settled and what is not.
- [recipe.md §4](docs/recipe.md#4-using-mellum-worker-delegated): recorded pathologies and the guard for each.
- [Ablation summary](docs/ladder/ablation-summary.md): every setting measured in and out.
- [Where the cost goes](docs/superpowers/research/2026-10-09-worker-cost-options.md): Mode versus Worker.
- [Recovery report](docs/superpowers/research/2026-10-07-mellum-recovery/report.md): why Mellum cannot be the primary agent.

## Requirements

- Apple Silicon Mac, [oMLX](https://github.com/jundot/omlx) 0.6.4 or newer, 9.9 GB for the weights
- Node 24 or newer; Pi 1.0 or newer (Worker also needs pi-subagents)
- OpenCode port: OpenCode 1.18 or newer (V1 plugin API); 2.x not yet

Other backends: [docs/backends/ollama.md](docs/backends/ollama.md) lists
what a port needs. Only oMLX has been run.

## How it works

A 643-character worker prompt, seven file tools, and in Pi two guards: a
nudge when a turn ends empty (at most three) and a loop breaker. The
prompt's default test commands are `uv run --offline pytest -q` (pytest
pyproject) and `node --test <file>` (package.json); a command in the brief
wins, and Mode supplies one from `## Mellum` or the fallback. Detail:
[docs/recipe.md](docs/recipe.md).

Nothing registers at load time. Pi loads Mode, dormant until `/mellum`;
OpenCode loads a one-hook plugin for the skill. The skill writes provider,
agent and rules into your config from [templates/](templates/). OpenCode
has no Mode or guards: Worker only, step-capped, unmeasured.

## Layout

```
prompts/mellum-worker.md      the prompt, single source
extensions/                   Mellum Mode and the child guards (Pi)
opencode/plugin.js            skills-path hook (OpenCode)
skills/mellum-setup/          the guided installer
templates/                    agent files and provider fragments, per host
scripts/                      merge-json, render-agent (the skill); mellum.mjs check, learn
docs/                         recipe, backend guides, docs/sdd.md
ladder/, docs/ladder/         the measuring ladder and its phase records
ROADMAP.md, BACKLOG.md        phases and deferred work
```

`npm test` runs the suite; `node build.mjs` regenerates the agent templates
after a prompt change. From `ladder/`: `uv run python -m pytest`, and
`uv run python -m ladder.run_ladder --help` for runs.

## Future work

In order; see [ROADMAP.md](ROADMAP.md) and [BACKLOG.md](BACKLOG.md).

- **M.7B:** run records for the Pi Worker and OpenCode.
- **M.8:** Worker one-liners (`async: false`, re-dispatch hint, intercom
  opt-out).
- **M.9:** an in-process Worker through Pi's SDK.
- **M.10:** a mediated brief, compared against project facts.
- **M.3, M.4:** measure the OpenCode port; an Ollama backend.

## Releases

Pin a tag in both install lines; OpenCode treats an unpinned git spec as
"latest" and may refresh it. Tags follow semver and match the package
version (a test checks it).
