# Steering Mellum, and what the next phase should be

**What is measured.** Three Mellum Mode run records in ac-demo on 2026-10-09
(`2026-10-09-steering-and-next-phase/mellum-mode-runs.jsonl`, copied from
`~/.pi/agent/mellum-mode-runs.jsonl`; the session transcripts are in
`~/.pi/agent/sessions/--Users-pauleveritt-projects-pauleveritt-ac-demo--/`),
one Mode run of a named-command task in a scratch directory
(`...scratchpad-modetest--`), the A17 phase record in mellum-mlx, the ladder
fixtures' layout, and Pi 1.0.2's source for the print-mode failure.

**What is conjecture.** That the prompt's default test command would still
be the trigger on a project the ladder has never seen; that a `tests/`
sub-directory fixture would separate `pytest` from `python -m pytest` on
the ladder; that the print-mode fix below is complete without a live run.

## 1. The three ac-demo runs, read together

| | 20:01 (v0.1.2, RPC) | 20:10 (interactive) | 20:42 (interactive) |
| --- | --- | --- | --- |
| task named a test command | no | no | no |
| requests, wall | 21, 46 s | 7, 9 s | 18, 26 s |
| first `uv run --offline pytest -q` | failed, `No module named 'hello'` | **passed** | failed, same error |
| what fixed it | subprocess test + root `__init__.py` | nothing: the 20:01 files were still on disk | `rm tests/test_hello.py`, rewrite at the root |
| files in the record | hello.py, tests/test_hello.py | `[]` | hello.py, tests/test_hello.py, test_hello.py |
| final reply | "created and the tests pass" | "created and tests pass" | "created successfully. The test passes." |

**The 20:10 record is explained.** Its transcript shows Mellum's first `ls`
finding `hello.py` and `tests/test_hello.py` from the 20:01 run (the ac-demo
tree was not reset; `git status` still shows them untracked), reading both,
running the test command once, and replying that it had created them. So
the three runs are not three samples of the trigger: they are two samples
of the trigger and one run on a pre-contaminated tree, which claimed
authorship of work it found. The signature in the record is `files: []`
with a passing command.

**The trigger is the same both times it fired.** Both clean runs wrote the
natural layout (root module, `tests/` test), ran the prompt's default, hit
`ModuleNotFoundError`, and spent the rest of the run making that command
exit 0: in the 20:42 transcript, 10 of 18 requests come after that first
failure. Neither run changed the command. The 20:42 run's `rm tests/test_hello.py` is the handoff's
missing-file case again (M.2 flags it as `(missing at handoff)`), and the
final reply does not mention the move.

**Confounds.** Two clean samples at temperature 1. Four of the failed
commands across the two runs are `python` not being on PATH in that shell,
which is the ac-demo environment, not the model. The task was deliberately
underspecified against the README's own advice (name the test command), so
these runs measure the default path, which is the path a first-time user
takes.

**A fourth observation, from the scratch run.** Given a named command
(`python3 -m pytest -q`) in a directory with no virtualenv, Mellum created
a venv, installed pytest from the network, and ran the tests green. The
completion fact "exits 0" licenses environment changes as readily as code
changes; the `--offline` in the prompt's default is doing quiet work in
the ac-demo runs, and a named command loses it.

## 2. Should the prompt body steer this?

Candidates in the backlog: default `python -m pytest`; "one change, then
test"; forwarding a section of AGENTS.md.

**Against editing `prompts/mellum-worker.md` now.**

- It is a measured setting (A2, A3, A4; the two completion facts took rung 5
  from 0/3 to 3/3), and `docs/sdd.md` says measured settings change only
  with a ladder run.
- Adding text has hurt before: A16's brief with intermediate "reply"
  instructions dropped direct runs to 11/15 because the model stopped at
  the first reply; v3's six-step procedure was "ignored or
  over-followed" and its removal (A2) was the cleanest phase of the
  ablation. Removals held; additions are where the risk is. A "one change,
  then test" line is exactly the kind of conduct rule A2 removed.
- **The ladder cannot see the change.** All four pytest fixtures (`ledger`,
  `rename`, `feature`, `edge`) keep the test file beside the module at the
  root with `testpaths = ["."]`, so the `pytest` entry point already has
  the module directory on `sys.path`. `pytest -q` and `python -m pytest -q`
  pass identically on every rung. A ladder phase on the current fixtures
  would be a regression check with zero discriminating power.
- The Worker path never uses the default in a measured run: every A10
  brief named the command. Only Mode is exposed, and only when the user
  omits it.

**For it.** `python -m pytest` is a superset: it adds the cwd to `sys.path`
and otherwise behaves the same, so the change cannot make a passing
layout fail. It is one line, shared by Mode and both Worker templates. The
default is wrong for the most common modern Python layout (tests in a
sub-directory, module at the root or under `src/`).

**Verdict.** Not in this phase, and not without a fixture that can
distinguish the two commands. The cheapest decisive experiment is in
mellum-mlx: a sixth fixture shaped like ac-demo (root module, `tests/`
sub-directory, no `pythonpath`, no package), a prompt variant
`prompts/ablation/v6-python-m-pytest.md`, and two 15-run phases (direct
and mode) against v5 on rungs 1–6. If v6 holds 14–15/15 on rungs 1–5 and
beats v5 on rung 6, it ships as v6 and the templates are re-rendered.
Whether to spend that ladder time is Paul's call; the research note only
sizes it.

**Alternatives, and why they do not change the verdict.**

- *Mode-side preflight that injects the test command into the task text*
  (pyproject with pytest, no `pythonpath`, a `tests/` directory without
  `__init__.py` → append "Test command: uv run --offline python -m pytest
  -q"). It changes the user message Mellum sees, so it is a measured
  setting in the same sense; the current fixtures would never trigger it,
  so "measured" would be vacuous; and the ladder's headless path
  (`MELLUM_MODE=1`, no `/mellum` command) would not even run code placed
  in the command handler. It is Mode-only, heuristic, and strictly
  dominated by the prompt change once the fixture exists. Backlog.
- *A guard that blocks `rm`/`mv` of a file the span wrote.* A guard is a
  measured setting (A1), no fixture reproduces the pathology, and blocking
  the move would have pushed the model toward a `sys.path` hack or a
  `conftest.py`, which are not better. Not proposed.
- *Handoff and run record.* These are off Mellum's request path (A17 showed
  the M.2 handoff changes did not move the ladder), so they can change
  without a ladder run. The handoff already lists every command and flags
  missing files; the run record does not, and it has no field a consumer
  could use to spot the 20:10 case or the A17 announce-and-stop miss. This
  is where the cheap work is (§3).
- *Documentation.* The README already says to name the command and why
  `pytest` differs from `python -m pytest`. The runs show users will still
  type the short sentence first.

**Which changes are "measured settings"** under the standing rule: anything
on Mellum's request path (the system prompt, the messages, the tool list,
the sampling fields) and anything that changes a tool call's outcome (a
guard block or a nudge). Not measured: what happens at deactivation (the
record, the handoff the parent sees, notifications), host-mode plumbing
(print versus interactive), and the ladder's own launch code, with the
caveat that a ladder change must be shown to launch the same thing (a
one-rung smoke, not a phase).

## 3. What else the results say

**The print-mode failure is a lifecycle bug, not a Mellum one.** In Pi
1.0.2, `session.prompt("/mellum <task>")` runs the extension command and
returns "handled" as soon as the handler returns; the handler returns right
after `pi.sendUserMessage(task)`. Print mode then leaves its loop and
disposes the runtime, which invalidates every extension ctx, while the
agent is still running the task: hence "This extension ctx is stale" from
the next hook and "turn_end could not resolve the persisted assistant entry
ID" from the torn-down session. No record is written because `/mellum off`
never runs. RPC mode works because the process stays alive. The fix is in
the command handler: when `ctx.hasUI` is false, await `ctx.waitForIdle()`
after sending the task and deactivate before returning, idempotently with
the `agent_settled` path. Not a measured setting; the ladder's headless
path does not go through the command.

**The run record is missing what this analysis needed.** It took the
transcript to explain 20:10 (no edits happened) and the A17 trace to see
the announce-and-stop miss (final turn had text, no tool call, stop reason
`stop`). Fields the record should carry, all computable at deactivation
from data it already walks: whether any written file is missing at the
end; whether each command changes files (`rm`, `mv`, `cp`, redirects,
`sed -i`, `touch`, `mkdir`, `git checkout|restore|clean|stash|reset`,
`pip`/`uv add`/`venv`); the final turn's stop reason and whether it made a
tool call; the nudge and loop-break counts; the edit and write count;
whether the task text named a test command; the host mode and how the
span was activated; the package version and prompt version. The schema
gets a version number so consumers can tell records apart.

**The reply-versus-reality gap is real but not a guard's job.** Recorded
forms: a reply that omits a file move (20:42), a reply that claims
authorship of pre-existing files (20:10), dead code left behind (run 1 of
the earlier finding, the root `__init__.py` in run 2), an environment
mutated to make a named command pass (the scratch run), and the three
false "fixed" claims in bare Pi (0c plain). The prompt's completion fact
makes "exits 0" the goal, and the model optimises it. The answer that is
measured is the one that already ships: the handoff states the facts the
reply omits, and the Worker's parent runs the tests itself. The record
fields above make the gap countable outside the session; a model-side
guard would be a measured change with no fixture behind it.

**The announce-and-stop miss stays in the backlog.** One in 30 Mode runs;
the record's final-turn field is what turns a second occurrence into
evidence without a ladder phase.

**The ladder's copy of the extension has drifted by 298 lines** (and the
guards by 75). A17 measured the shipped copy through a monkeypatching
wrapper that was not kept. The backlog's reopen condition ("the next change
to `extensions/`") is met by the print-mode fix, so the ladder change
belongs in the same phase: the ladder takes a worker root and the
mellum-mlx copies go. The mode launch must also drop the installed package
from the mirrored profile and not load `mellum-guards.ts` separately, or
Mode and its guards run twice (A17's wrapper did both).

## 4. The phase

M.5 groups the no-ladder work: the print-mode one-shot fix, run record
schema 2, the ladder taking the extension from a worker root, and the
docs. Spec: `docs/superpowers/specs/2026-10-09-m5-print-mode-and-record-design.md`.
It goes before M.3 because the OpenCode runner M.3 needs should read the
templates from the same worker root rather than grow a third copy. The
measured candidates (prompt v6 on a sixth fixture; the preflight; the
announce-and-stop nudge; the mutating-command guard) stay in the backlog
with their reopen conditions.

## What would falsify this

- A rung-6 fixture on which `pytest -q` and `python -m pytest -q` both pass
  or both fail: then the trigger is the brief, not the command, and the
  prompt stays v5.
- `pi -p --no-session "/mellum <task>"` still failing after the handler
  awaits idle: then Pi disposes before `agent_settled` for a reason the
  source read missed, and the fix needs `pi.sendMessage` with a settle
  hook instead.
- A rung-1 mode smoke from the worker root landing outside A17's
  7–9 requests: then the ladder's launch changed what it measures.

## Risks

- Two clean samples at temperature 1 are an anecdote; the §2 verdict
  rests on the fixture argument and A16, not on the rate.
- Record schema 2 adds fields without a consumer; the field list is sized
  by this analysis and may still miss the next question.
- Changing the ladder's launch for mode runs (package removed from the
  mirror, no separate guards file) is the A17 wrapper made permanent; if
  the wrapper differed from the ladder in a way A17's README did not
  record, the smoke will show it as a request-count shift.
- The print-mode fix is verified by unit tests against a fake Pi and one
  live smoke; a Pi release that changes the dispose order could reopen it.
