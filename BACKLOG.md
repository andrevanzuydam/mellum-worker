# Backlog: mellum-worker

Deferred work. Read [`ROADMAP.md`](ROADMAP.md) for what is in flight.

Every entry states a reopen condition; an entry over 1,200 characters owes a
research doc and shrinks to a summary, a link, and its reopen condition.
Resolved entries are removed once their outcome is recorded in a phase row or
a research doc that the row links. Cite entries by heading anchor, never by
line number.

Reopen conditions, not promises.

**Prompt default `python -m pytest`.** Prompt v5 guesses `uv run --offline
pytest -q`, which runs the `pytest` entry point without the project root on
`sys.path`; `python -m pytest` would have passed both clean ac-demo runs
first time. The prompt is measured, and the ladder as it stands cannot see
the change: all four pytest fixtures keep the test beside the module with
`testpaths = ["."]`, so both commands pass every rung. The experiment is
sized in the [steering note](docs/superpowers/research/2026-10-09-steering-and-next-phase.md)
§2: a sixth fixture shaped like ac-demo, a `v6` prompt variant, direct and
mode phases against A3 and A17. *Reopens when* Paul schedules that phase in
`ladder/`.

**Mode-side test-command preflight.** Instead of the prompt, Mode could
detect a pyproject with pytest, no `pythonpath`, and a `tests/` directory
without `__init__.py`, and append "Test command: uv run --offline python -m
pytest -q" to the task. It changes what Mellum reads, the current fixtures
would never trigger it, and the ladder's headless path does not run the
command handler, so it would be measured in name only. *Reopens when* the
prompt-default phase above fails the ladder and the sixth fixture exists.

**Ladder drives the one-shot command.** After M.5, `pi -p "/mellum
<sentence>"` works, so the ladder could launch the shipped command (and get
run records per run) instead of `MELLUM_MODE=1`. That changes the measured
launch (an on-marker in the messages), so it is a phase compared against
A17, not a runner tweak. *Reopens when* the next Mode phase is scheduled.

**Final reply omits moves and pre-existing work.** Recorded forms: a reply
silent about `rm tests/test_hello.py`; a reply claiming to have created files
a previous run left behind (`files: []`, one passing command); dead code and
an environment mutated to make a named command pass. The completion fact
makes "exits 0" the goal. The handoff and the Worker's parent test run are
the measured answers; schema-2 records (M.5) make the gap countable.
*Reopens when* records show two or more runs whose final reply claims success
with `filesMissingAtEnd` non-empty or `lastCommand` not `ok`.

**One change, then test.** In the ac-demo run Mellum made two edits between
test runs and left dead code behind. A prompt line enforcing one change per
test run is a prompt change. *Reopens when* the ladder measures it.

**Mode and the project's AGENTS.md.** Mode deliberately sends only the worker
prompt; project rules never reach Mellum. An opt-in that forwards a named
section of AGENTS.md is unmeasured. *Reopens when* a user reports a task that
cannot be stated in one line because the project rules are too long.

**OpenCode 2.x plugin shape.** The V2 host reads `default.setup`, not
`server`, and uses a flat `skills` array. *Reopens when* a 2.x host is
available to test against.

**Empty-final nudge misses announce-and-stop turns.** The guard nudges only
when a turn ends with no text. The A17 rung 5 miss ended with "Now let's run
the tests again." and no tool call: the turn had text, so no nudge fired and
the run stopped unfinished. A check for a final turn that announces an action
without making a tool call would catch it, but it is a guard change on a
single observed miss in 30 Mode runs (A14, A17). *Reopens when* a second
announce-and-stop miss is recorded in a ladder phase or a run record.

**Mediated brief: the main model writes Mellum's task.** Mode sends the
`/mellum` text to Mellum word for word, so it passes only when the user writes
a fact sheet (files, test command, constraints), and few developers will. A
big model can write that brief from a loose request or a spec file. Two
shapes: a Mode variant (`/mellum brief <request>`: the parent writes the brief,
shows it, then runs it under Mode) or a parent-side skill plus a
model-callable tool that queues `/mellum <brief>` as a follow-up. Tight
leash: a main model rewriting a handoff packet has gone wrong in other
projects, so the brief is shown before it runs, is checked against a fixed
shape (files, test command, constraints, nothing else), and Mode records the
brief and the user's original text side by side. The worker prompt is
unchanged, so this is not a measured setting. *Reopens when* M.9 is scheduled
(M.5 has closed): compare loose `/mellum` against mediated runs on the
ac-demo phase specs with schema-2 records.

**`/mellum learn`: show users what happened and how to tune.** Run records
hold the evidence (a test command failing in 7 to 25 variants before one
passes; files written outside the project's layout; a success reply after a
failed last command; deadline hits, nudges), but most users never find or
read `~/.pi/agent/mellum-mode-runs.jsonl`. A `/mellum learn` subcommand reads
the recent records for the current project, deterministically, with no
model call, names each pattern in plain words with counts, and proposes the
remedy: for test-command thrash, the `## Mellum` section with the command
that finally passed. It shows the section and asks before writing it to
`AGENTS.md`. Worker needs the same: the Pi child and the OpenCode subagent
write no record today, so this needs a record from the guards extension and
the OpenCode plugin, and a host-neutral analyser (`scripts/mellum-learn.mjs`)
that a skill can run in either host. *Reopens when* M.7 closes with the facts
block shipped; then it is scheduled as M.7A.
