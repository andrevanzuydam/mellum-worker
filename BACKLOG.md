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
`sys.path`; `python -m pytest` would have passed the ac-demo hello-world run
first time. The prompt is measured, so the change needs a ladder run, and the
ladder fixtures may not distinguish the two commands. *Reopens when* a ladder
phase in mellum-mlx compares the two defaults.

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

**Run-record consumers.** The JSONL record exists so another session can
analyse runs; nothing reads it yet. *Reopens when* a second consumer wants a
field the record lacks, which decides the schema.
