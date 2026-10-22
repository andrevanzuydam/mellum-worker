# Basic Remedies: the worker's parts, measured one at a time

Date: 2026-10-21. Status: approved by Paul on 2026-10-21; amended the
same day after the screen.

**Dated correction 2026-10-21.** The Basic Remedies module is dropped. The
45-session screen showed a null prompt, a nudge lead, no loop effect and a
hard floor. The shipped worker is the **Baseline Worker**, compared with
**Baseline Pi**; it is not decomposed into separate lessons. The harness, the
baseline lesson, the extension-mechanics lesson, the template update and the
glossary remain. The rest of this document records the design that led to the
screen and is superseded where it says Basic Remedies ships as lessons.

## Intent

The Learning Center teaches one worker as a bundle: the system prompt, seven
tools, guards, facts and handoff. The first findings lesson therefore compares
bare Pi with the whole worker. It cannot say which part produced the gain.

This work splits the shipped worker into measured **basic remedies**, teaches
the extension mechanism separately, and gives every findings lesson a
before/after evidence table with the same metrics. It does not add a second
main model or a new worker implementation.

## Goals

- Getting Started lesson 5 teaches what a Pi extension is and how the worker
  uses hook points, events and callbacks. It does not make remedy claims.
- The Lessons index opens with a **Basic Remedies** module: the system prompt,
  the empty-final nudge and the loop breaker. Each is a six-step lesson with a
  before/after table.
- Every findings lesson keeps the same suites, arms and metrics, and compares
  inside a suite, never across easy/medium/hard.
- The lesson template gains an **Evidence of the solution** table under
  Validation, without changing the six-step sequence.
- The suite harness gains arms, metrics and an evidence report; the bug that
  runs suites without their `base/` project is fixed first.

## Non-goals

- A separate "big brain" model, a new model, or a new agent harness.
- A tools remedy: `WORKER_TOOLS` is exactly Pi's seven built-in tools, so bare
  Pi and the worker have the same tool set. Tool control stays a mechanism in
  Getting Started, not a measured remedy.
- New guards. `newFileOnlyWrite` and `createStepBudget` stay dormant and out
  of Basic Remedies.
- Project facts as a basic remedy. Facts remain a later remedy; the full
  worker (with facts) is the control for the basics.
- Rewriting every existing findings lesson. The template and the basics pages
  move now; other lessons adopt the table when they are revised.

## Decisions

1. **Ablation, not build-up.** The full worker is the control. A basics lesson
   removes one part and shows the problem returning. The shipped `/mellum`
   already contains all three parts; a build-up would not describe the
   artifact.
2. **Three basics, not four.** Prompt, empty-final nudge, loop breaker. The
   seven tools are Pi's built-ins, so there is no tool ablation to run.
3. **Getting Started teaches mechanism.** Lesson 5 explains extensions,
   commands, events and callbacks; it shows the three levers in code. It does
   not include the ditch transcript and there is no Lesson 6.
4. **Facts are later.** The full worker includes `## Mellum` facts; every
   basics arm keeps them on. The facts lesson compares the full worker with
   facts off.
5. **Six steps stay.** Validation gains an `Evidence of the solution`
   subsection with the table, followed by `Checks` for tests and static
   analysis. No seventh top-level step.
6. **n = 3 per suite per arm.** Five arms × three suites × three sessions =
   45 sessions. The full worker is shared by the three ablations.
7. **Same metrics everywhere.** Passes, turns, failed checks, tool errors,
   context, wall and output tokens. Definitions below.

## Curriculum

Getting Started (five lessons):

1. Base Pi on llama.cpp
2. The ditch
3. Make a mini harness
4. Eval suites and the telemetry
5. The worker extension — mechanics only: a Pi extension, `registerCommand`,
   `pi.on`, events, callbacks, and the levers for prompt, tools and guards.

No Lesson 6.

Lessons, new order:

- **Start here:** The primary agent is the wrong worker. Bare Pi versus the
  full worker, with easy/medium/hard tables.
- **Basic Remedies:** The prompt; the empty turn (nudge); the loop (breaker).
- **Prompt and project:** A short prompt; project facts; one spec file per
  phase.
- **Loop and handoff:** Thinking is working memory; who holds the loop; a
  prose brief; the intercom block.
- **Context and cost:** context search; the remaining independent lessons.

“Guards for empty turns and loops” leaves the index: its two guards become the
two Basic Remedies lessons. “Write only the files you list” stays in the
prompt/project group as a later remedy.

## Evidence design

Arms:

| Arm | Extension | System prompt | Tools | Nudge | Loop breaker |
| --- | --- | --- | --- | --- | --- |
| `bare` | no | Pi base | Pi's seven | no | no |
| `worker` | yes | worker prompt | Pi's seven | on | on |
| `no-prompt` | yes | Pi base | Pi's seven | on | on |
| `no-nudge` | yes | worker prompt | Pi's seven | off | on |
| `no-loop` | yes | worker prompt | Pi's seven | on | off |

Each basics lesson uses `worker` as the before arm and its `no-*` arm as the
after arm. The primary lesson uses `bare` and `worker`. The facts and later
remedies keep the full worker as their control unless the lesson says
otherwise.

Metrics, per session:

| Column | Definition |
| --- | --- |
| Passes | sessions whose expected grader IDs all passed, over n |
| Turns | `provider_request` rows |
| Failed checks | expected grader IDs not reported `PASSED` |
| Tool errors | `tool_result` rows with `isError` |
| Context | largest `usage.input` over the session's requests, in tokens |
| Wall | seconds from the run start to the last settled child |
| Output tokens | sum of `usage.output` |

The table reports means over n, except Passes. `n = 3`. A missing metric is
reported as `—`, never silently zero. Compare rows only within one suite.

A single-session smoke may be run to prove the arms, but it is not cited.
The 45-session run is the evidence. It requires explicit approval to start the
llama.cpp server.

## Lesson template

The six steps remain: Problem, Eval case, Evidence of the problem, Solution,
Validation, Interpretation.

Under `## Validation`:

```markdown
### Evidence of the solution

**Badge:** `…`

| Suite | Arm | Passes | Turns | Failed checks | Tool errors | Context | Wall | Output tokens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| easy | before | | | | | | | |
| easy | after | | | | | | | |

### Checks

The test suite and static analysis, with the command and what it said.
```

The table is required for a lesson that changes a setting, prompt, tool set or
guard. A code-only lesson may use `Checks` alone, but must say why there is no
arm.

## Harness

- Fix `run_suite` to copy `base/` (then `start/` over it) before any run.
- Add `--arm {bare,worker,no-prompt,no-nudge,no-loop}`.
- Worker arms load the extension with `MELLUM_MODE=1`; `no-prompt` keeps Pi's
  system prompt; `MELLUM_GUARDS` sets the nudge/breaker.
- Report `turns`, `failed_checks`, `tool_errors`, `context`, `wall` and
  `output_tokens`; write a `run.json` beside the trace.
- Add `learn/code/evidence.py` to aggregate run directories into the Markdown
  table; it reads `run.json`, never the model's final reply.
- The existing `--grade`, `--repeat`, `--deadline` and qualification paths
  keep working.

## Acceptance

- `npm test`, `node --test tests/docs-caps.test.mjs`, and
  `uv run python -m pytest learn/code/tests` pass.
- `harness.py run --suite easy --arm worker --dry-run` names the extension and
  environment; a real run copies the base project.
- The 45 sessions complete, and the lesson tables are generated from their
  `run.json` files.
- Getting Started has five lessons; there is no Lesson 6.
- Basic Remedies has three lessons, each with a before/after table.
- The template has `Evidence of the solution` and the same metric columns.
