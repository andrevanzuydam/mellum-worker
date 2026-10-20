---
phase: LC.3A
cycle: 1
lifecycle: active
---

# LC.3A Suite, telemetry and grading implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The learner runs `uv run learn/code/harness.py suite all --grade`, gets one line per task with its turn/tool counts, and sees the Validation step's three graders — `ruff`, `pyrefly` and `complexipy` — pass or fail on the model's own files.

**Architecture:** The harness grows a `report(run)` over the recorder's JSONL, a `suite` subcommand that runs several tasks in order, and `grade(workspace)` that shells out to `uvx` for the three tools. Grading runs before the task's tests are copied in, so it sees only what the model wrote. Lesson 3 teaches the reading.

**Tech Stack:** Python 3.14 stdlib harness, `uvx` for pytest and the three graders, Node's test runner for the CLI wrapper.

**Spec:** [Learning Center design](../specs/2026-10-20-learning-center-design.md) §4 (lesson 3), §12.

## Global Constraints

- Grader commands and exit meanings: `uvx ruff check .` (default rules), `uvx pyrefly check .` with a generated `pyrefly.toml` (`project-includes = ["**/*.py"]`) because a bare path exits 0 even on a type error, and `uvx complexipy --max-complexity-allowed 10 .`.
- Grading runs on the workspace before `score` copies the task's tests in; a grading failure never changes the score.
- Complexipy's threshold is 10; do not add or swap a tool. `radon` stays uninstalled.
- The telemetry counts come from `trace.jsonl` only: `provider_request`, `tool_call`, `tool_result.isError`, and the last assistant `message_end` text.
- `suite` names may be `easy`, `medium`, `hard`, `all`, or several at once; it prints one line per task and a final `n/m passed`, and exits 0 even when tasks fail.
- Every new test is shown failing first.

## Review Focus

1. **A grader that checks nothing.** `pyrefly` with a bare path passes a type error; the harness must always write the config and the test with a `return x` under `-> str` must fail. Pinned by Task 3.
2. **Grading the tests instead of the solution.** `tests/` must not exist when `grade` runs; a task whose tests import `pytest` would otherwise change the lint result. Pinned by Task 3's fake workspace and Task 5's order test.
3. **A suite that stops at the first failure.** `suite all` must run every task and sum the passes. Pinned by Task 2.
4. **A trace with no assistant text.** `report` returns an empty final reply and the counts it has, rather than raising. Pinned by Task 1.
5. **A failed grade hiding a PASS.** The score line keeps the test result and the graders are separate lines; a lint failure never turns a PASS into FAIL. Pinned by Task 5.

---

### Task 1: Read the trace

**Files:**
- Modify: `learn/code/harness.py`, `learn/code/tests/test_harness.py`, `tests/harness-cli.test.mjs`

**Interfaces:**
- Produces: `report(run: Path) -> dict` with keys `requests`, `tool_calls`, `tool_errors`, `final_reply`; the `run` line becomes `easy: PASS (run <dir>; 4 requests, 3 tool calls, 0 tool errors)`.

- [ ] **Step 1: Write the failing tests.** In `test_harness.py`, write a run directory by hand with a `trace.jsonl` of four rows (one `provider_request`, one `tool_call`, one `tool_result` with `isError: true`, one assistant `message_end` with a text block) and assert `report` returns `{1, 1, 1, "ok"}`; a second trace with no assistant text returns an empty `final_reply` and zero counts. In `harness-cli.test.mjs`, assert the PASS line matches `/; \d+ requests, \d+ tool calls, \d+ tool errors\)$/`.
- [ ] **Step 2: Run and see them fail.** `node --test tests/harness.test.mjs tests/harness-cli.test.mjs` → FAIL, `report` missing and the old line shape.
- [ ] **Step 3: Implement `report`** over `json.loads` of each non-empty line; count by type, take the last assistant text block, default `final_reply` to `""`. Use it in the CLI's score line.
- [ ] **Step 4: Run and see them pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `git add learn/code/harness.py learn/code/tests/test_harness.py tests/harness-cli.test.mjs && git commit -m "feat(lc3a): the score line carries the run's counts"`

---

### Task 2: Run a suite

**Files:**
- Modify: `learn/code/harness.py`, `learn/code/tests/test_harness.py`, `tests/harness-cli.test.mjs`
- Test fixtures: `learn/code/tests/fixtures/tasks/mul/{task.md,tests/test_mul.py,solution/mul.py}`, `learn/code/tests/fixtures/fake-pi-mul.sh`

**Interfaces:**
- Produces: `suite(names: list[str], *, tasks_dir: Path, runs_dir: Path, pi_binary: str) -> tuple[int, int]` returning `(passed, total)`; the CLI subcommand `suite NAMES...` accepts `all` and prints one score line per task and `n/m passed`.

- [ ] **Step 1: Write the failing tests.** With a tasks dir holding `add` and `mul`, `suite(["all"], …)` using `fake-pi.sh` and `fake-pi-mul.sh` returns `(2, 2)`; `suite(["add"], …)` returns `(1, 1)`; with `fake-pi-empty.sh` it returns `(0, 1)` while the CLI prints `add: FAIL` and `0/1 passed` and exits 0; an unknown name exits 2 with a message.
- [ ] **Step 2: Run and see them fail.** Same command → FAIL, no `suite`.
- [ ] **Step 3: Implement `suite` and the CLI subcommand.** Expand `all` to the sorted task directory names, run each, print each line, then `f"{passed}/{total} passed"`.
- [ ] **Step 4: Run and see them pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `git add learn/code tests/harness-cli.test.mjs && git commit -m "feat(lc3a): run a suite in one command"`

---

### Task 3: Grade the model's files

**Files:**
- Modify: `learn/code/harness.py`, `learn/code/tests/test_harness.py`

**Interfaces:**
- Produces: `grade(workspace: Path) -> list[tuple[str, bool, str]]` with one tuple per tool (`ruff`, `pyrefly`, `complexipy`), running `uvx` with the commands in Global Constraints; it writes `pyrefly.toml` into the workspace first and returns the last line of each tool's output.

- [ ] **Step 1: Write the failing tests.** A workspace holding `def fizz(n): return str(n)` passes all three; adding `import os` fails `ruff` only; adding `def f(x: int) -> str: return x` fails `pyrefly`; a 12-branch function fails `complexipy`; `tests/` exists in none of these cases and a workspace with a `tests/test_x.py` importing pytest still grades only the solution.
- [ ] **Step 2: Run and see them fail.** `node --test tests/harness.test.mjs` → FAIL, `grade` missing.
- [ ] **Step 3: Implement `grade`.** Write the `pyrefly.toml`, then run each tool with `cwd=workspace`, `capture_output=True`, and `env={**os.environ, "PYTHONPATH": str(workspace)}`; success is `returncode == 0`.
- [ ] **Step 4: Run and see them pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `git add learn/code && git commit -m "feat(lc3a): grade the workspace with ruff, pyrefly and complexipy"`

---

### Task 4: The medium and hard tasks

**Files:**
- Create: `learn/code/tasks/medium/{task.md,tests/test_duration.py,solution/duration.py}`
- Create: `learn/code/tasks/hard/{task.md,tests/test_top_words.py,solution/top_words.py}`
- Modify: `learn/code/tests/test_harness.py`

**Interfaces:**
- Produces: `medium` asks for `duration.py` with `parse_duration("1h 30m") == 5400`, `"45s" == 45`, `"2h" == 7200`, `"0s" == 0`, and `ValueError` on `"nonsense"`; `hard` asks for `top_words.py` with `top_words(text, n, min_length=1)` returning `(word, count)` pairs sorted by count then word, lowercase, punctuation stripped, plus a `main(path, n, min_length)` that prints them.

- [ ] **Step 1: Write the failing test.** In `test_harness.py`, for each of `medium` and `hard`: the task's tests fail on an empty workspace and pass with `solution/` copied in, using `uvx pytest`.
- [ ] **Step 2: Run and see it fail.** `node --test tests/harness.test.mjs` → FAIL, tasks missing.
- [ ] **Step 3: Write the two tasks, their tests and solutions.**
- [ ] **Step 4: Run and see it pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `git add learn/code && git commit -m "feat(lc3a): medium and hard tasks the suite can score"`

---

### Task 5: `--grade` in the commands

**Files:**
- Modify: `learn/code/harness.py`, `tests/harness-cli.test.mjs`
- Test fixtures: `learn/code/tests/fixtures/fake-pi-unused-import.sh`

**Interfaces:**
- Produces: `run --grade` and `suite … --grade` print one `ruff: PASS|FAIL`, `pyrefly: …`, `complexipy: …` line per task after its score line; grading happens before `score` copies the tests in; `--grade` does not change the exit code or the PASS/FAIL word.

- [ ] **Step 1: Write the failing tests.** `run --task add --grade` with `fake-pi.sh` prints `PASS` and three PASS lines; with `fake-pi-unused-import.sh` (correct `add.py` plus `import os`) still prints `add: PASS` and `ruff: FAIL`; without `--grade` no grader lines appear.
- [ ] **Step 2: Run and see it fail.** `node --test tests/harness-cli.test.mjs` → FAIL, no `--grade`.
- [ ] **Step 3: Implement the flag** in both subcommands, printing each grader's name and result and nothing else from its output unless it failed (then the last line).
- [ ] **Step 4: Run and see it pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `git add learn/code tests/harness-cli.test.mjs && git commit -m "feat(lc3a): grade beside the score, never instead of it"`

---

### Task 6: Lesson 3 and its docs

**Files:**
- Create: `learn/getting-started/suite.md`
- Modify: `learn/getting-started/index.md`, `zensical.toml`, `tests/learn-site.test.mjs`, `learn/project/toolchain.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: `suite`, `--grade`, `report`.
- Produces: front matter `title: A suite and the telemetry`, `track: getting-started`, `position: 3`, `prerequisites: [getting-started/harness]`, `authors: [Paul Everitt]`, `backends: [llamacpp]`.

- [ ] **Step 1: Write the failing test.** Add `suite.md` to `PAGES` and the nav; assert the page contains `suite all --grade`, `ruff`, `pyrefly`, `complexipy`, `trace.jsonl`, and the words "three" and "graders"; assert the index links it and has no "coming".
- [ ] **Step 2: Run and see it fail.** `node --test tests/learn-site.test.mjs` → FAIL, page missing.
- [ ] **Step 3: Write the page.** Run the suite; read one line per task with requests, tool calls and errors; run `--grade` and what the three graders check; open `trace.jsonl` for the turns, tool names, errors and final reply; what a FAIL means; why easy can pass while hard fails; the reference run is LC.3B. Add the nav entry, the index link, the suite/grade commands to the maintainer page, and the changelog entry.
- [ ] **Step 4: Run and see it pass.** `node --test tests/learn-site.test.mjs` → PASS; `uvx zensical build` clean.
- [ ] **Step 5: Commit.** `git add learn zensical.toml tests/learn-site.test.mjs CHANGELOG.md && git commit -m "docs(lc3a): lesson 3, the suite and the telemetry"`

---

## Verification

- `npm test` and `node --test tests/docs-caps.test.mjs` pass; `uvx zensical build` is clean.
- `uv run learn/code/harness.py suite all --grade` (live) runs three tasks against the local server and prints three score lines with grader lines.
- The live suite needs the LC.2 server and weights; it is not part of the suite run in `npm test`.
