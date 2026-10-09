# Finding: the same underspecified prompt, twice, in ac-demo

**What is measured.** Two one-shot Mellum Mode runs of the prompt "Write a
hello world python file with a unit test" in the ac-demo project, one on
v0.1.1 from an interactive session with DeepSeek Flash as the parent, one on
v0.1.2 over Pi's RPC mode. Numbers come from the session transcripts and,
for the second run, from the new run record. Sampling is the model card's
1 / 0.95 / 20, so the two paths differ by chance as well as by version.

**What is conjecture.** That the prompt's default test command is the
trigger in both runs. It is supported by a reproduction (below) but not by
a ladder phase.

## The two runs

| | run 1, v0.1.1 | run 2, v0.1.2 |
| --- | --- | --- |
| requests | 15 | 21 |
| tool calls | 14 | 20 |
| output tokens | 3,302 | 5,909 |
| wall, first to last turn | 21 s | 46 s |
| failed commands | 1 | 6 |
| passed in the end | yes | yes |
| final layout | `tests/hello.py`, `tests/test_hello.py` with a dead `sys.path` line | `hello.py`, `tests/test_hello.py` as a subprocess test, plus an empty root `__init__.py` |

Both runs wrote `hello.py` at the repo root and a test that imports it,
and both failed the first `uv run --offline pytest -q` with
`ModuleNotFoundError: No module named 'hello'`. Everything after that is
the model searching for a way to make that command exit 0.

Run 1 moved the module into `tests/` (which alone fixes it, because pytest
puts the test file's directory on the path) and then added
`sys.path.insert(0, "..")`, which does nothing. Two changes, one test run.

Run 2 tried six things: a direct import through two interpreters,
`pytest -v`, `touch __init__.py` at the repo root, running the test file as
a script, printing `sys.path`, and finally rewrote the test to run
`hello.py` as a subprocess and added a `__main__` block to `hello.py`. The
root `__init__.py` stayed behind and does nothing.

## Reproduction of the trigger

With ac-demo's own virtualenv and the first layout both runs chose:

| command | result |
| --- | --- |
| `pytest -q` (the prompt's default, via the entry point) | fails |
| `python -m pytest tests` | passes |
| `pytest -q` with `pythonpath = ["."]` in pyproject | passes |

So the layout was fine; the default command was not, and Mode sends no
project file that could have said otherwise. The ac-demo AGENTS.md was
rewritten between the runs; it had no effect on either, because Mode never
sends it.

## What the v0.1.2 change bought

The run-1 handoff reported `hello.py` as written after a bash `mv` had
removed it. The run-2 handoff and record list every command, including
`touch __init__.py`, which is a file the old handoff could not have
mentioned at all. The record also gave this note its numbers without
parsing a transcript.

## Regression check

The ladder's Mode phase rerun against the shipped v0.1.2 extension
([A17](../../ladder/ablation-a17-mode-v012/README.md)):
14/15, 12.9 requests per run, 44 s mean wall, against A14's 14/15, 13.1 and
70 s. The run-2 slowdown above is sampling, not the code.

## What would falsify this

A ladder phase in mellum-mlx comparing `uv run --offline pytest -q` with
`uv run --offline python -m pytest -q` as the prompt default, on fixtures
whose tests import a root module. If the pass rates and request counts do
not move, the trigger is the brief, not the command.

## Risks

- Two samples at temperature 1 are an anecdote, not a rate.
- The RPC run had Ornith as the parent model and no human in the loop; the
  one-shot path does not use the parent for generation, so this should not
  matter, but it was not measured.
- Both runs "passed". A user who trusts the final line gets a layout they
  did not ask for; the README's right-sizing bullets are the current
  mitigation.
