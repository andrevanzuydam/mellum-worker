# Facts wording: where "Write only" came from, and what a session in ac-demo showed

Date: 2026-10-11.

**What is measured.** A19's `## Mellum` section (`Test command`, `Write
only: app.py, models.py, templates/, tests/`, `Do not: …`) on AgentClinic
rungs 6–9: 9/12, 0/12 runs outside the list; the fallback test command alone
(A20): 7/12, 5/12 outside. Nothing else in this note is measured.

**What is conjecture.** That the `Do not:` wording below keeps A19's results
without the `Write only:` list; that a uv bullet and a `.venv` bullet help
Mellum. A21 and the "Facts and learn v2" backlog entry are the tests.

## Where the file list came from

ac-demo's first phase specs (commit `5579b09`) each opened with "You may
write only app.py, models.py, files under templates/, and files under
tests/." The mission and tech stack came from swiftstar's agenttest fixture
(`8442d14`); the sentence is eval-harness scaffolding: it keeps an agent
from sprawling and makes grading deterministic. M.7 moved it into the
`## Mellum` section as `Write only:`, which A19 measured. The looser specs
also name `app.py`, `models.py` and `templates/base.html`, but only because
hidden tests import them or later phases build on them; they describe what
to build, not an allow-list.

## A wrong bullet in v0.1.4

v0.1.4 replaced `Write only:` in the README, the setup skill and `/mellum
learn`'s suggestion with "Do not: … add files at the project root". A
session in ac-demo on 2026-10-11 pointed out that this contradicts a
roadmap that puts `app.py` and `models.py` at the root. The bends the
records show are specific files: `__init__.py`, `conftest.py`, `pytest.ini`,
`setup.cfg`, and dependency changes. v0.1.5 names those instead.

## What the session's telemetry showed

A hello-world task in ac-demo, 20 s, 10 turns, 9 tool calls (the session's
own readout; the agent was not Mellum Mode, since it read `AGENTS.md`
itself):

- `find . -name "*.py"` walked `.venv`: 7.8 s (39% of the task) and about
  51,000 characters of vendored paths, carried in context for every later
  turn.
- Bare `python -m pytest` exited 127: no `python` on PATH; only `uv run …`
  or `.venv/bin/python` work. ac-demo's roadmap says "`python app.py`
  starts the app", which fails as written.
- Five read-only calls before a two-line file.

## What would falsify this

A21 at or above A19 (9/12, 0/12 outside) with the named-bends `Do not:` and
no `Write only:` would confirm the lighter section; below it, the docs go
back to recommending `Write only:`. A Mellum run log with no exit-127 or
`.venv` scans in projects that lack the uv and `.venv` bullets would make
those bullets unnecessary.

## Risks

- The session's numbers are one run, read from its own log.
- Naming four files may miss other bends (`setup.py`, `tox.ini`); `learn`
  only suggests what the records show.
