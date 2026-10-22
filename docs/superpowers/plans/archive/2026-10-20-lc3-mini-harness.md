---
phase: LC.3
cycle: 1
lifecycle: closed
---

# LC.3 Make a mini harness implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A learner runs `uv run learn/code/harness.py run --task easy` and gets one score line from an isolated child Pi run, with the task's tests kept out of the model's workspace until after it exits.

**Architecture:** `learn/code/harness.py` (stdlib) copies a task into a fresh run directory, copies the private profile, starts `pi -p` there with the lesson recorder, then copies the hidden tests in and scores them. The recorder is a small Pi extension writing JSONL to `MELLUM_TRACE_FILE`; LC.3A reads it. The profile's model id is read from `learn/code/profile/models.json`, so the harness does not repeat a setting.

**Tech Stack:** Python 3.14 through `uv` (stdlib only), `uvx pytest` for the harness tests and task scoring, Node's test runner for the recorder and the wrapper.

**Spec:** [Learning Center design](../specs/2026-10-20-learning-center-design.md) §4 (lesson 2), §7, §12.

## Global Constraints

- Pi runs with `PI_CODING_AGENT_DIR` pointing at the run's copied profile, plus `--no-approve --no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files --no-session`; nothing reads or writes `~/.pi`.
- The model id and provider come from `learn/code/profile/models.json`; the harness never hardcodes them.
- Hidden tests are copied into the workspace only after the child has exited.
- Every run gets a fresh directory under `learn/code/.runs/` (gitignored), whether it passes or fails.
- The recorder writes `MELLUM_TRACE_FILE` rows with `traceSchema: 1`, `runId`, `seq`, `type`: `instance_start`, `provider_request`, `tool_call`, `tool_result`, `message_end`, `agent_settled`.
- No new third-party Python dependency; `uvx` supplies pytest.
- macOS is the tested lane. Every new test is shown failing first.

## Review Focus

1. **Tests visible before scoring.** A task's tests must not exist in the workspace while `pi` runs; the fake `pi` in the tests exits non-zero if it sees `tests/`. Pinned by Task 3.
2. **Two runs of the same task.** The second must not inherit the first's files or trace. Pinned by Task 3.
3. **A model that writes nothing.** Scoring reports FAIL, keeps the run directory and prints the test tail; no traceback. Pinned by Task 4.
4. **`pi` missing.** The harness exits non-zero with a message naming `pi` and no half-scored run. Pinned by Task 3.
5. **A learner's own `~/.pi`.** The child env sets `PI_CODING_AGENT_DIR` and the flags list, so nothing loads from it. Pinned by Task 3's fake `pi`, which prints the profile path it was given.

---

### Task 1: The lesson recorder

**Files:**
- Create: `learn/code/record-pi.mjs`
- Test: `tests/record-lesson.test.mjs`

**Interfaces:**
- Produces: `installRecorder(pi, options = {})` where `pi.on(name, fn)` registers handlers and `options.write(row)` receives each row (default appends to `process.env.MELLUM_TRACE_FILE`); `export default function install(pi)` calls it when that env var is set, so `pi -e learn/code/record-pi.mjs` needs no flag.

- [ ] **Step 1: Write the failing test.** `tests/record-lesson.test.mjs` builds a fake `pi` with `on`, captures rows, and drives `before_provider_request`, `tool_call`, `tool_result`, `message_end` (assistant) and `agent_settled`. Assert the row types in order, that `provider_request` counts 1, that `tool_result.isError` is kept, and that every row has `traceSchema: 1`, a `runId` and a `seq` starting at 1.
- [ ] **Step 2: Run it and see it fail.** `node --test tests/record-lesson.test.mjs` → FAIL, module missing.
- [ ] **Step 3: Implement `installRecorder`.** Count requests, record `toolName` and `isError`, record the assistant `message_end`, and write `agent_settled` with `aborted` when present. Default `write` appends `JSON.stringify(row) + "\n"` to `MELLUM_TRACE_FILE`.
- [ ] **Step 4: Run it and see it pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `git add learn/code/record-pi.mjs tests/record-lesson.test.mjs && git commit -m "feat(lc3): a lesson recorder for each run"`

---

### Task 2: The Python test wrapper

**Files:**
- Create: `tests/harness.test.mjs`
- Create: `learn/code/tests/test_harness.py`

**Interfaces:**
- Produces: `tests/harness.test.mjs` runs `uvx pytest learn/code/tests -q` from the repo root and requires exit 0; every later Python test in this plan lands under `learn/code/tests/` and is picked up by it.

- [ ] **Step 1: Write the failing wrapper.** `spawnSync("uvx", ["pytest", "learn/code/tests", "-q"], {cwd: ROOT})`; assert `status === 0` with stderr shown.
- [ ] **Step 2: Run it and see it fail.** `node --test tests/harness.test.mjs` → FAIL: no tests collected (pytest exit 5).
- [ ] **Step 3: Write the first Python test.** `learn/code/tests/test_profile.py` asserts the generated profile names one `llamacpp` provider and the model id `Mellum2.1-12B-A2.5B-Thinking` — the pin the harness will read.
- [ ] **Step 4: Run and see it pass.** Same wrapper → PASS 1/1.
- [ ] **Step 5: Commit.** `git add tests/harness.test.mjs learn/code/tests/test_harness.py && git commit -m "test(lc3): run the harness's Python tests from npm test"`

---

### Task 3: One isolated run

**Files:**
- Create: `learn/code/harness.py`
- Modify: `learn/code/tests/test_harness.py`
- Test fixtures: `learn/code/tests/fixtures/tasks/add/{task.md,tests/test_add.py}`, `learn/code/tests/fixtures/fake-pi.sh`, `learn/code/tests/fixtures/fake-pi-empty.sh`
- Modify: `.gitignore` (`learn/code/.runs/`)

**Interfaces:**
- Produces: `Task` with `name: str`, `prompt: str`, `tests: Path`, `start: Path | None`; `load_task(tasks_dir: Path, name: str) -> Task`; `new_run(runs_dir: Path, name: str) -> Path` (timestamped, fresh); `profile_pin(profile_dir: Path) -> tuple[str, str]` (the first provider's name and its first `models[].id`); `pi_argv(pi_binary: str, profile: Path, recorder: Path, model: str, prompt: str) -> list[str]`; `run_task(task: Task, *, runs_dir: Path, profile: Path, pi_binary: str = "pi") -> Path` returning the run directory. `run_task` copies `profile/` into the run, seeds the workspace from `start/` when present, writes `prompt.txt`, creates an empty `trace.jsonl`, sets `PI_CODING_AGENT_DIR` and `MELLUM_TRACE_FILE`, spawns the child in the workspace, and raises `SystemExit` naming `pi` when the binary is missing. It does **not** copy `tests/`.

- [ ] **Step 1: Write the failing tests.** In `test_harness.py`: loading the `add` fixture yields its prompt and tests path; `pi_argv` contains `-p`, `--no-session`, `--no-approve`, `--no-context-files`, `-e`, the recorder, the profile model id and the prompt; two `new_run` calls yield different directories; `run_task` with `fake-pi.sh` returns a run whose workspace has `add.py` (the fake wrote it) and no `tests/`, whose `profile/models.json` exists, and whose `trace.jsonl` exists; a second run's workspace does not contain the first's file; `run_task` with `--pi-binary /nonexistent` raises `SystemExit` mentioning `pi`.
- [ ] **Step 2: Run and see them fail.** `node --test tests/harness.test.mjs` → FAIL on the missing functions.
- [ ] **Step 3: Implement `harness.py`'s loading, run directory, profile copy, argv and spawn.** The fake `pi` is a shell script:

```sh
#!/bin/sh
[ -d tests ] && exit 9
printf 'def add(a, b):\n    return a + b\n' > add.py
echo "$PI_CODING_AGENT_DIR"
```

`fake-pi-empty.sh` writes nothing and exits 0; `fake-pi-wrong.sh` returns `a - b`.
- [ ] **Step 4: Run and see them pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `git add learn/code tests/harness.test.mjs .gitignore && git commit -m "feat(lc3): one isolated run per task"`

---

### Task 4: Score the workspace

**Files:**
- Modify: `learn/code/harness.py`
- Modify: `learn/code/tests/test_harness.py`
- Test fixtures: `learn/code/tests/fixtures/fake-pi-wrong.sh`

**Interfaces:**
- Produces: `score(run: Path, task: Task) -> tuple[bool, str]`; it copies `task.tests` to `run/workspace/tests/`, runs `uvx pytest -q` in the workspace, and returns whether it passed plus the output tail. `run_task` gains `score_run: bool = False`? No: the CLI calls `score` after `run_task`, so `run_task` stays a pure spawn.

- [ ] **Step 1: Write the failing tests.** `fake-pi.sh` (writes a correct `add.py`) scores `(True, tail with "passed")`; `fake-pi-empty.sh` scores `(False, tail)` and the run directory still exists; `fake-pi-wrong.sh` writes a failing `add.py` and scores `False`.
- [ ] **Step 2: Run and see them fail.** `node --test tests/harness.test.mjs` → FAIL, `score` missing.
- [ ] **Step 3: Implement `score`.** `shutil.copytree(task.tests, workspace/"tests")`, `subprocess.run(["uvx", "pytest", "-q"], cwd=workspace, capture_output=True, text=True)`, return `returncode == 0` and the last 20 lines of output.
- [ ] **Step 4: Run and see them pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `git add learn/code tests/harness.test.mjs && git commit -m "feat(lc3): score the workspace after the run"`

---

### Task 5: The CLI and its score line

**Files:**
- Modify: `learn/code/harness.py`
- Create: `tests/harness-cli.test.mjs`

**Interfaces:**
- Produces: `uv run learn/code/harness.py run --task NAME [--tasks-dir DIR] [--runs-dir DIR] [--pi-binary PATH] [--dry-run]`; `--dry-run` prints the child's argv and exits; otherwise it prints one line, `easy: PASS (run learn/code/.runs/<id>)` or `... FAIL ...`, and exits 0 for a completed run whatever the score.

- [ ] **Step 1: Write the failing test.** Run the CLI against the `add` fixture and assert one score line:

```js
const pass = run("run", "--task", "add", "--tasks-dir", TASKS, "--runs-dir", RUNS,
  "--pi-binary", resolve(FIX, "fake-pi.sh"));
assert.equal(pass.status, 0, pass.stderr);
assert.match(pass.stdout, /^add: PASS \(run .+\)$/m);
```

Repeat with `fake-pi-empty.sh` and assert `add: FAIL`; `--dry-run` prints a line containing `-p` and the recorder path.
- [ ] **Step 2: Run and see it fail.** `node --test tests/harness-cli.test.mjs` → FAIL, no `run` subcommand.
- [ ] **Step 3: Implement the CLI** with `argparse`: `run` keeps the run directory on failure, prints the score line and the run path, and prints the test tail on failure.
- [ ] **Step 4: Run and see it pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `git add learn/code/harness.py tests/harness-cli.test.mjs && git commit -m "feat(lc3): one command, one score line"`

---

### Task 6: The easy task

**Files:**
- Create: `learn/code/tasks/easy/task.md`, `learn/code/tasks/easy/tests/test_fizz.py`, `learn/code/tasks/easy/solution/fizz.py`
- Modify: `learn/code/tests/test_harness.py` (fixture test)

**Interfaces:**
- Produces: a task whose prompt asks for `fizz(n)` (`Fizz` for multiples of 3, `Buzz` for 5, `FizzBuzz` for 15, otherwise `str(n)`), tests that check those four cases and `0`, and a reference solution in `solution/` that is never copied into a run.

- [ ] **Step 1: Write the failing test.** The fixture test runs the task's tests against an empty workspace (expect failure) and against `solution/` copied in (expect pass), using `uvx pytest -q`.
- [ ] **Step 2: Run and see it fail.** `node --test tests/harness.test.mjs` → FAIL, task missing.
- [ ] **Step 3: Write the task, its tests and the solution.**
- [ ] **Step 4: Run and see it pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `git add learn/code/tasks learn/code/tests && git commit -m "feat(lc3): an easy task the harness can score"`

---

### Task 7: Lesson 2 and its docs

**Files:**
- Create: `learn/getting-started/harness.md`
- Modify: `learn/getting-started/index.md`, `zensical.toml`, `tests/learn-site.test.mjs`, `learn/project/toolchain.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: the CLI from Task 5, the easy task from Task 6.
- Produces: front matter `title: Make a mini harness`, `track: getting-started`, `position: 2`, `prerequisites: [getting-started/base-pi-on-llamacpp]`, `authors: [Paul Everitt]`, `backends: [llamacpp]`.

- [ ] **Step 1: Write the failing test.** In `tests/learn-site.test.mjs`, add `harness.md` to `PAGES` and the nav check, and assert the page contains, in order and case-insensitively, `isolation` (or "fresh directory"), `uv run learn/code/harness.py run --task easy`, `score`, `learn/code/.runs`; assert `getting-started/index.md` links it and has no "coming".
- [ ] **Step 2: Run and see it fail.** `node --test tests/learn-site.test.mjs` → FAIL, page missing.
- [ ] **Step 3: Write the page.** Why a run needs its own directory and its own profile; what the harness copies and when the tests arrive; the one command and the score line; how to open `learn/code/.runs/<id>/workspace` and read `prompt.txt` and `trace.jsonl`; what a FAIL means. Add the nav entry and the index link, add the harness commands to `learn/project/toolchain.md`, and add the changelog `Added` entry.
- [ ] **Step 4: Run and see it pass.** `node --test tests/learn-site.test.mjs` → PASS; `uvx zensical build` clean.
- [ ] **Step 5: Commit.** `git add learn zensical.toml tests/learn-site.test.mjs CHANGELOG.md && git commit -m "docs(lc3): lesson 2, make a mini harness"`

---

## Verification

- `npm test` and `node --test tests/docs-caps.test.mjs` pass; `uvx zensical build` is clean.
- `uv run learn/code/harness.py run --task easy` (live) prints one score line and leaves a run directory.
- The live run's Pi call needs the server from LC.2 and the Q4_K_M weights; it is not part of the suite.

## Result

2026-10-20. Shipped on `lc3`, unreleased: `learn/code/harness.py` (one task,
one isolated run, hidden tests copied after the exit, one score line),
`learn/code/record-pi.mjs`, the `easy` fixture, lesson 2, and the harness
commands in the maintainer pages.

Verified: `npm test` 340/340, docs caps, `uvx zensical build` clean, and a
live run through the llama.cpp server — `easy: PASS`, with a 21-row trace
(4 provider requests, 3 tool calls, 0 tool errors) and the model's
`fizz.py` passing the hidden tests.
