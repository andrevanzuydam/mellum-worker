# Backlog: mellum-worker

Deferred work. Read [`ROADMAP.md`](ROADMAP.md) for what is in flight.

Every entry states a reopen condition; an entry over 1,200 characters owes a
research doc and shrinks to a summary, a link, and its reopen condition.
Resolved entries are removed once their outcome is recorded in a phase row or
a research doc that the row links. Cite entries by heading anchor, never by
line number.

Reopen conditions, not promises.

**Prompt default `python -m pytest` (Worker).** Prompt v5 guesses `uv run
--offline pytest -q`, which runs the `pytest` entry point without the
project root on `sys.path`. Since M.7, Mellum Mode forwards the `## Mellum`
test command, or `uv run --offline python -m pytest -q` for a pytest
pyproject (AgentClinic rungs 6–9: section 9/12,
fallback only 7/12, facts off 1/12 rescored;
[research note](docs/superpowers/research/2026-10-09-m7-project-facts.md)).
The Worker's child still sees only the brief and the prompt, so a parent
that omits the test command gets the guess. A `v6` default is a prompt
change for both paths, sized in the
[steering note](docs/superpowers/research/2026-10-09-steering-and-next-phase.md)
§2; rungs 6–9 are the ac-demo-shaped fixture it asked for. *Reopens when*
Paul schedules a delegated phase on rungs 6–9 in `ladder/`, or a Worker run
is recorded failing on the guessed command.

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
unchanged, so this is not a measured setting. *Reopens when* M.10 is
scheduled: compare mediated runs on rungs 6–9 against A18 (loose `/mellum`,
facts off) and A19 (the `## Mellum` section), with schema-2 records.

**Write-only guard: refuse writes outside the facts block's list.** Mode
forwards the `## Mellum` section's `Write only:` line as text; nothing
enforces it. On AgentClinic rungs 6–9 the text was enough: with the section
forwarded, 0/12 runs had a non-empty `outside_write_list`
([A19](docs/ladder/ablation-a19-facts-on/README.md)), against 8/12 with facts
off (A18) and 5/12 with the fallback only (A20, no list sent). A guard that refuses `write`/`edit` outside the list is a guard
decision, so it is measured before it ships.
*Reopens when* a facts-on ladder phase or a run record shows a non-empty
`outside_write_list` with the list forwarded.

**Ladder PATH leaks its venv into Mellum's shell.** `uv run` in `ladder/`
puts `ladder/.venv/bin` first on `PATH`, and Mellum's bash inherits it, so
bare `python` is the ladder's own interpreter. A20 9 r1 ran `python -m
ensurepip` and `python -m pip install` (`starlette`, `httpx2`, the last
downloaded) there; the controller restored it with `uv sync --exact
--offline`. Scores were unaffected: each workspace
used its own `.venv` ([A20](docs/ladder/ablation-a20-facts-fallback-only/README.md)).
Remedy: `child_env` (and `mode_env` through it) drops `ladder/.venv/bin`
from `PATH` as it already drops `VIRTUAL_ENV`; optionally the scorer flags
a run whose commands touched the ladder's venv. *Reopens when* the next
change to `ladder/`, or any record showing a mutation outside the
workspace.

**Deadline leaves workspace servers running.** Every run cut at the 600 s
deadline in M.7 (A18 6 r2, 8 r1, 9 r1; A19 8 r2; A20 6 r2) ended on a
foreground `uvicorn`/app server, and the runner left it listening on ports
8000–8003. A19 8 r2 and A20 6 r2 hit those ports (`Address already in
use`); scores were unaffected, and the controller stopped the servers on
2026-10-10 about 09:50 EDT
([A19](docs/ladder/ablation-a19-facts-on/README.md),
[A20](docs/ladder/ablation-a20-facts-fallback-only/README.md) Risks).
Remedy: at the deadline and at run end the runner kills the run's process
group and any listener whose cwd is the workspace, and records it.
*Reopens when* the next change to `ladder/`, or any record showing a
leftover process.

**A21: the lighter `## Mellum` section and a one-file roadmap.** README,
setup skill and `/mellum learn` now suggest `Test command:` plus `Do not:`
naming the bends seen (dependencies; `__init__.py`, `conftest.py`,
`pytest.ini`, `setup.cfg`; weakened tests) and no `Write only:` list; A19's
9/12 and 0/12 outside the layout were measured with `Write only:`
([note](docs/superpowers/research/2026-10-11-facts-wording.md)). ac-demo
now keeps its phases in one `specs/roadmap.md`, asked for as "Implement
Phase N of specs/roadmap.md". A21 is a rungs 6–9 fixture variant with both,
12 runs against A19; if it falls short, the docs go back to `Write only:`.
*Reopens when* the GPU is free for an hour and Paul schedules it.

**Facts and learn v2: uv and `.venv`.** A session in ac-demo lost an
exit-127 detour to bare `python` (not on PATH; only `uv run` works) and 39%
of its time to `find .` walking `.venv`
([note](docs/superpowers/research/2026-10-11-facts-wording.md)). Candidates:
a suggested bullet `Run Python with uv: uv run python …`; `learn` patterns
for "command not found" or exit 127 on `python`/`pytest` (remedy: the uv
bullet) and for `find`/`grep -r` over `.` without excluding `.venv`
(remedy: a positive bullet, `List project files with: git ls-files`;
in a bare-Pi run on 2026-10-11 "Do not: search .venv/" did not stop
`find .` walking 52 KB of `.venv`, while the command-shaped uv bullet
worked first time, so suggest commands, not prohibitions); ac-demo's roadmap saying `uv run
python app.py`; `/mellum check` linting the `## Mellum` section (nested
bullets or continuation lines, a test label not exactly `Test command:`, a
fallback adding a second test command; seen in ac-demo 2026-10-11). The
bullets change what Mellum reads, so they are measured with A21.
*Reopens when* A21 is scheduled.
