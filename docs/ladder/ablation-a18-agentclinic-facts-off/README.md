# A18: Mellum Mode on the AgentClinic rungs 6–9, project facts off (baseline for M.7)

**What is measured.** Mellum Mode as shipped (v0.1.2, prompt v5, guards on)
with the project-facts block switched off, on the four AgentClinic rungs:
build the project from `specs/phase-1-home.md` to `phase-4-resolve-reopen.md`,
one phase per rung, from a fresh workspace each. Three repeats per rung.
This is the baseline the M.7 ship rule compares A19 and A20 against.

Launch, 2026-10-09 20:15 EDT, from `ladder/` at commit `38a4e64` (finished
21:19 EDT):

    uv run python -m ladder.run_ladder --mode mode --profile baseline --rung 6 --rung 7 --rung 8 --rung 9 --repeat 3 --deadline 600 --mode-facts off --out ../docs/ladder/ablation-a18-agentclinic-facts-off

oMLX was up with `Mellum2.1-12B-A2.5B-Thinking-6bit` listed before the
launch. `~/.pi/agent/mellum-mode-runs.jsonl` had 7 lines before and 7 after.

**Scoring changed after the run.** A run passes when the project's test
command passes, the hidden behaviour tests pass, no existing test is removed
or edited, and nothing was written outside the `AGENTS.md` write-list. The
run scored under the strict rule 3 (every starting test file byte-identical),
which failed an appended test (rung 7 r1). Paul changed the rule to "no
existing test is removed or edited; additions are allowed" (spec §2 rule 3,
commit `6a869b8`). The strict result is in each `run.json` `check` and in
`table.md`; the rescored result is in `check_rescored`, written by
`python -m ladder.rescore --existing-tests-kept` from the retained workspaces.
**The rescored numbers are the A18 baseline.** A19 and A20 are scored under
the same rule, so the comparison is same-rule.

## Result

| rung | passes, strict | passes, rescored | requests, median (runs) | wall s, median (runs) |
| --- | --- | --- | --- | --- |
| 6 (phase 1, home) | 0/3 | 0/3 | 42 (62, 25, 42) | 199 (199, 600, 128) |
| 7 (phase 2, board) | 0/3 | 1/3 | 42 (32, 65, 42) | 135 (128, 268, 135) |
| 8 (phase 3, add) | 0/3 | 0/3 | 57 (57, 93, 39) | 315 (600, 315, 170) |
| 9 (phase 4, resolve and reopen) | 0/3 | 0/3 | 51 (49, 51, 91) | 400 (600, 253, 400) |
| all | 0/12 | 1/12 | 50 (mean 54) | |

Wall is the runner's untrusted clock. Three runs hit the 600 s deadline
(rung 6 r2, rung 8 r1, rung 9 r1; all `toolUse` at the cut), and rung 9 r3
ended on `length`.

## Per run

`wp` is `outside_write_list`; `facts` is `facts_cmd_pass`; `hid` is
`hidden_pass`; `kept` is `tests_unchanged` (strict / rescored).

| run | pass (strict / rescored) | requests | wp | facts | hid | kept |
| --- | --- | --- | --- | --- | --- | --- |
| 6 r1 | no / no | 62 | `__init__.py`, `pytest.ini` | yes | yes | yes / yes |
| 6 r2 | no / no | 25 | none | no | no | yes / yes |
| 6 r3 | no / no | 42 | `pyproject.toml`, `uv.lock` | yes | yes | yes / yes |
| 7 r1 | no / **yes** | 32 | none | yes | yes | no / yes |
| 7 r2 | no / no | 65 | `__init__.py` | yes | yes | no / yes |
| 7 r3 | no / no | 42 | `__init__.py` | yes | yes | no / yes |
| 8 r1 | no / no | 57 | `__init__.py` | no | no | no / yes |
| 8 r2 | no / no | 93 | `__init__.py`, `pyproject.toml`, `pytest.ini`, `uv.lock` | yes | yes | yes / yes |
| 8 r3 | no / no | 39 | `__init__.py` | yes | no | no / yes |
| 9 r1 | no / no | 49 | none | yes | no | yes / yes |
| 9 r2 | no / no | 51 | `__init__.py`, `pytest.ini` | yes | no | no / yes |
| 9 r3 | no / no | 91 | none | yes | no | yes / yes |

## Failure shapes

- **The import error, in 11 of 12 runs.** The tests do `from app import app`;
  `uv run --offline pytest -q` cannot import `app` (`ModuleNotFoundError: No
  module named 'app'`). Only rung 6 r2 never reached it: it never ran pytest,
  only `python app.py`. Eleven runs ran the prompt's `uv run --offline
  pytest -q` first. Four (6 r1, 7 r2, 8 r2, 9 r3) did also try `python -m
  pytest`, which puts the working directory on the path, and still went on to
  add `__init__.py` or `pytest.ini`.
- **The fixes the model reached for are the write-list violations.** An
  `__init__.py` at the root in 7 runs, a `pytest.ini` in 3 (6 r1, 8 r2, 9 r2),
  `pyproject.toml` and `uv.lock` edits in 2 (6 r3, 8 r2). Six runs got the
  project and hidden tests green (6 r1, 6 r3, 7 r1, 7 r2, 7 r3, 8 r2); five
  of those carry a write-list entry, so the write-list alone turned five of
  six behaviourally working runs into failures. That is the signal M.7's
  facts block is meant to move.
- **Edits to test imports.** Rung 7 r2 and r3, rung 8 r3 and rung 9 r2 edited
  existing test files at module level (`sys.path.insert`, `from ..app import
  app`, a removed blank line). Strict scoring counted these; rule 3 does not,
  because no test function changed. Rung 8 r3's relative import left its
  hidden tests failing.
- **Deadlines and give-ups.** Rung 6 r2 spent 600 s and 25 requests writing
  `app.py` and `base.html` and never ran pytest. Rung 8 r1 and rung 9 r1
  hit the deadline still working around the import. Rung 9 r3 ended on
  `length` after 91 requests and 37 tool errors; its final text says the
  import error persists, then assumes the task is complete.
- **Rung 9 never reached the hidden tests.** Hidden failed in all three
  rung-9 runs, including the two with an empty write-list: the work was not
  finished, not blocked by scoring.
- **Rung 7 r1 is the only pass.** It appended one test to `tests/test_app.py`
  (strict fail, rescored pass), wrote only `models.py` and a template beside
  `app.py`, and used one nudge.

## What is conjecture

That the import error, and the missing hint to use `python -m pytest`, is
the cause of most of the wasted requests and write-list entries. It recurs in
11 of 12 traces, but this phase has no run that removes it. A19 (facts on)
is the test.

## What would falsify this

A19 with the same launch and `--mode-facts on` landing at or below A18's
rescored passes, or at or above A18's median requests (50), would mean the
test command was not the bottleneck.

## Risks

- Three repeats per rung; one pass in twelve is not a stable estimate, and
  the ship rule's "A18 + 3 or at least 10/12" is read against it.
- Rescoring ran on the retained workspaces after the rule change, not as a
  new run; `outside_write_list`, `facts_cmd_pass` and `hidden_pass` are
  carried unchanged.

Raw traces, stdout and diffs: [`ablation-a18-agentclinic-facts-off.tar.gz`](https://github.com/pauleveritt/mellum-worker/releases/download/research-2026-10-09/ablation-a18-agentclinic-facts-off.tar.gz)
(sha256 `de705fd02d80afd57e0ab9ddf154e35886cd8d8e05180e5401bb59e9ccdf83fe`).
