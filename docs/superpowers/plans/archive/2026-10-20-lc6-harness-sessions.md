---
phase: LC.6
cycle: 1
lifecycle: closed
---

# LC.6 Harness sessions and repeats implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A task can hold one or more prompts, run them in one Pi session in one workspace, score once at the finish, and repeat the whole session `--repeat N` times with n printed on every line.

**Architecture:** A task gains `prompts: list[str]`: `prompts/*.md` sorted by name when that directory exists, otherwise the single `task.md`. `run_task` invokes `pi -p` once per prompt with the same `--session-id` and a `--session-dir` under the run, so the model keeps one context while the trace file accumulates. Scoring and telemetry read the whole session. `--repeat` wraps the session, not the prompt.

**Tech Stack:** Python 3.14 stdlib harness, Node test runner, `uvx pytest` for scoring.

**Spec:** [Learning Center design](../specs/2026-10-20-learning-center-design.md) §4 (sessions and repeats).

## Global Constraints

- Prompt order is filename order under `prompts/`; `task.md` is the single-prompt form and stays supported.
- One session: one workspace, one profile copy, one `trace.jsonl`, one `--session-id`; the session directory lives under the run, never `~/.pi`.
- Score once, after the last prompt. Grading, when asked, also runs once, before the tests are copied in.
- `--repeat N` defaults to 1; every task line states `n`, and a summary counts sessions, never a rate.
- No new Python dependency. Every new test is shown failing first.

## Review Focus

1. **A second prompt losing the first.** Every prompt must carry the same `--session-id`; the fake `pi` records it and the test compares. Pinned by Task 2.
2. **A session writing to `~/.pi`.** `--session-dir` must point inside the run; the fake writes the value it saw and the test asserts it. Pinned by Task 2.
3. **Scoring a half-finished session.** The tests must be copied only after the last prompt, not between prompts; the fake exits non-zero if it sees `tests/` on any invocation. Pinned by Task 2.
4. **A repeat reported as a rate.** `--repeat 2` prints n and a count of sessions, not a percentage or a claim. Pinned by Task 3.
5. **A fixture with an empty prompt file.** Loading fails with the file named, not a silent empty message. Pinned by Task 1.

---

### Task 1: A task is one or more prompts

**Files:** Modify `learn/code/harness.py`, `learn/code/tests/test_harness.py`; add a two-prompt fixture under `learn/code/tests/fixtures/tasks/steps/`.

**Interfaces:**
- Produces: `Task.prompts: list[str]`; `load_task` reads `prompts/*.md` sorted when the directory exists, else `task.md`, strips each, and raises `SystemExit` naming an empty or missing prompt.

- [ ] **Step 1: Test.** A `steps` fixture with `prompts/01-first.md`, `prompts/02-second.md` loads in that order; the existing `add` fixture loads one prompt; an empty prompt file raises with its name.
- [ ] **Step 2: Run it and see it fail.** `node --test tests/harness.test.mjs` → FAIL, no `prompts`.
- [ ] **Step 3: Implement** the loader, keeping `prompt` as `prompts[0]` for compatibility with the existing page text.
- [ ] **Step 4: Pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `feat(lc6): a task is one or more prompts`

---

### Task 2: One session, many prompts

**Files:** Modify `learn/code/harness.py`, `learn/code/tests/test_harness.py`; fixtures `fake-pi-session.sh` (records each call's prompt and session id to a file, exits 9 if `tests/` exists) and a `steps` task whose tests pass only after the second prompt (the fake writes the solution on the second call).

**Interfaces:**
- Produces: `run_task` creates one `--session-id` (`uuid4`), passes `--session-dir <run>/sessions` and one prompt per child invocation, appending to the same trace; it returns the run directory after the last prompt. `pi_argv` gains `prompts: list[str]`? No: `pi_argv` stays per prompt; `run_task` builds the shared prefix once.

- [ ] **Step 1: Test.** With the session fake, `run_task` on `steps` invokes `pi` twice, both with the same `--session-id`, both with `--session-dir` inside the run, prompts in order; the workspace has the fake's `done.txt`; `tests/` never existed during either call; `trace.jsonl` has two `instance_start` rows.
- [ ] **Step 2: Run it and see it fail.**
- [ ] **Step 3: Implement** the loop; the first invocation creates the session, the rest continue it.
- [ ] **Step 4: Pass.**
- [ ] **Step 5: Commit.** `feat(lc6): one session across the prompts`

---

### Task 3: `--repeat` and n on every line

**Files:** Modify `learn/code/harness.py`, `tests/harness-cli.test.mjs`, `learn/code/tests/test_harness.py`.

**Interfaces:**
- Produces: `run --repeat N` and `suite --repeat N`; a task with n > 1 prints one line per session (`easy [1/2]: PASS (run …; …)`) then `easy: 1/2 sessions passed`; n = 1 keeps the single line with `n=1` added. `suite` ends with `2/3 tasks passed (5/9 sessions)`.

- [ ] **Step 1: Test.** `--repeat 2` with the passing fake prints `2/2 sessions passed`; with the empty fake prints `0/2`; the single-run line contains `n=1`; the suite summary counts sessions.
- [ ] **Step 2: Run it and see it fail.**
- [ ] **Step 3: Implement** the repeat loop and the summaries; every run directory is fresh.
- [ ] **Step 4: Pass.**
- [ ] **Step 5: Commit.** `feat(lc6): repeat a session and print its n`

---

### Task 4: Docs and close

**Files:** Modify `learn/project/toolchain.md`, `learn/getting-started/harness.md`, `learn/getting-started/suite.md`, `CHANGELOG.md`, `ROADMAP.md`; archive this plan.

- [ ] **Step 1:** The harness page says a task may hold one or more prompts, the suite scores once at the finish, and `--repeat` states its n; the suite page's "one observation" note points at `--repeat`.
- [ ] **Step 2:** `npm test`, docs caps, `uvx zensical build`.
- [ ] **Step 3:** Close LC.6 with `## Result`, archive, `## Now` → LC.7.
- [ ] **Step 4:** Commit `docs: close LC.6 — harness sessions and repeats`.

## Verification

- `npm test` passes; the suite's n lines match the sessions run.
- A live session (`uv run learn/code/harness.py run --task easy --repeat 2`) needs llama.cpp and is not part of the suite; I will ask before starting it.

## Result

2026-10-20. Shipped on `lc6`, unreleased: a task holds one prompt (`task.md`)
or several (`prompts/*.md`, filename order); `run_task` sends them in one Pi
session (`--session-id`, `--session-dir` under the run) in one workspace with
one trace; scoring and grading happen once, after the last prompt.
`--repeat N` repeats the session, every single-run line says `n=1`, multi-run
lines are `[i/n]` with a `k/n sessions passed` summary, and `suite` ends with
`a/b tasks passed (c/d sessions)`.

Verified: `npm test` 350/350, docs caps, `uvx zensical build` clean. No live
session was run: it needs llama.cpp, and the plan asks first.
