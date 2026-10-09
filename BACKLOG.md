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

**The ladder measures the repo copy, not the package.** `ladder/run_ladder.py`
in mellum-mlx points at `.pi/mellum/mellum-mode.ts`, which had drifted 260
lines from the shipped extension by v0.1.2. The A17 phase ran the shipped
copy through a wrapper and found no regression (14/15, 12.9 requests, 44 s vs
A14's 70 s), but the wrapper is scratch code. *Reopens when* the next change
to `extensions/` is made: the ladder should take the extension path as an
argument and the mellum-mlx copy should go.

**Empty-final nudge misses announce-and-stop turns.** The guard nudges only
when a turn ends with no text. The A17 rung 5 miss ended with "Now let's run
the tests again." and no tool call: the turn had text, so no nudge fired and
the run stopped unfinished. A check for a final turn that announces an action
without making a tool call would catch it, but it is a guard change on a
single observed miss in 30 Mode runs (A14, A17). *Reopens when* a second
announce-and-stop miss is recorded in a ladder phase or a run record.
