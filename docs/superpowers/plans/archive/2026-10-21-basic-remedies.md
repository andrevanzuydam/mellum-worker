# Basic Remedies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the worker’s prompt, empty-final nudge and loop breaker separately measurable, teach extension mechanics in Getting Started, and give findings lessons a before/after evidence table.

**Architecture:** The suite harness gains arms, metrics and an evidence report. The full worker is the control; each basics arm removes one part. Getting Started teaches the extension mechanism; Lessons owns the measured remedies.

**Tech Stack:** Python 3.14 harness, Pi TypeScript extensions, pytest, Node tests, Zensical.

**Spec:** `docs/superpowers/specs/2026-10-21-basic-remedies-design.md`

**Dated correction 2026-10-21:** Tasks 6 and 7 are cancelled. The 45-session
screen did not support the Basic Remedies pages, and the module was dropped.
The harness, template, Getting Started mechanics, glossary and baseline
lesson shipped; this plan is archived as the route to that decision.

## Global Constraints

- No new model, no separate “big brain”, no new agent harness.
- `WORKER_TOOLS` is Pi’s seven built-ins; tools are not a remedy.
- Basic Remedies is three lessons: prompt, empty-final nudge, loop breaker.
- Six lesson steps stay; `Evidence of the solution` is a Validation subsection.
- n = 3 per suite per arm; compare only within a suite.
- Never cite a smoke run as evidence.
- No GPU run until Paul approves starting llama.cpp.

## Review Focus

- A suite must start from its `base/` project, or every score is meaningless.
- A missing metric must print `—`, never `0`.
- A worker arm must not silently fall back to base Pi when the extension or model is missing.
- Context is the largest prompt, not the sum across turns.
- The `no-prompt` arm must still use the worker’s tools and guards.

---

### Task 1: Fix the suite base

**Files:**
- Modify: `learn/code/harness.py`
- Test: `learn/code/tests/test_harness.py`

**Interfaces:**
- Produces: `run_suite` copies `suite.root/base`, then `suite.start` if present.

- [ ] **Step 1: Write the failing test**

Add `test_run_suite_copies_the_base_project`: build a temporary suite with `base/seed.txt`, one prompt, and a test; run it with `fake-pi.sh`; assert `workspace/seed.txt` exists.

- [ ] **Step 2: Run it and see it fail**

Run: `uv run python -m pytest learn/code/tests/test_harness.py::test_run_suite_copies_the_base_project -q`
Expected: FAIL, `seed.txt` missing.

- [ ] **Step 3: Implement the copy**

In `run_suite`, before the loop: if `suite.root` has `base/`, copy it to `workspace`; then overlay `suite.start` when present.

- [ ] **Step 4: Run the harness tests**

Run: `uv run python -m pytest learn/code/tests/test_harness.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit the fix and test.

### Task 2: Report the six evidence metrics

**Files:**
- Modify: `learn/code/harness.py`
- Test: `learn/code/tests/test_harness.py`

**Interfaces:**
- Produces: `report(run)` returns `requests`, `tool_calls`, `tool_errors`, `final_reply`, plus `turns`, `context`, `wall`, `output_tokens`.
- Produces: `score_workspace` also reports `failed_checks`; keep the existing pass/tail API where possible.

- [ ] **Step 1: Write failing tests**

Add a trace with `message_end.usage.input` 1200 and 1800, `.output` 40 and 60, and timestamps two seconds apart. Assert `turns == 2`, `context == 1800`, `output_tokens == 100`, `wall == 2.0`. Add a grader case whose expected IDs are not all `PASSED` and assert `failed_checks` equals the missing count.

- [ ] **Step 2: Run and see them fail**

Run the new tests; expect missing keys.

- [ ] **Step 3: Implement**

Count `provider_request` for turns; max `usage.input` for context; sum `usage.output`; wall from first to last trace timestamp; `failed_checks` from expected IDs not in `PASSED`. Write `run.json` beside `trace.jsonl` with suite, arm placeholder, metrics and pass/fail.

- [ ] **Step 4: Run all harness tests**

Run: `uv run python -m pytest learn/code/tests/test_harness.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

### Task 3: Add arms

**Files:**
- Modify: `learn/code/harness.py`
- Modify: `extensions/mellum-worker.ts`
- Test: `learn/code/tests/test_harness.py`, `tests/mellum-worker.test.mjs`

**Interfaces:**
- Produces: `--arm {bare,worker,no-prompt,no-nudge,no-loop}`.
- Produces: `MELLUM_WORKER_PROMPT=pi` keeps Pi’s system prompt while leaving tools and guards on.
- Produces: worker arms load `extensions/mellum-worker.ts` and set `MELLUM_MODE=1`; guard arms set `MELLUM_GUARDS`.

- [ ] **Step 1: Write the failing tests**

Assert `pi_argv` for `worker` includes `-e extensions/mellum-worker.ts`; assert `no-nudge` sets `MELLUM_GUARDS` with only `loopBreaker`; assert `no-loop` sets only `emptyFinalNudge`; assert `no-prompt` sets `MELLUM_WORKER_PROMPT=pi`. Add an extension unit test that `filterForMellum(payload, "", { keepSystem: true })` leaves Pi’s system message and still filters tools.

- [ ] **Step 2: Run and see them fail**

- [ ] **Step 3: Implement**

Thread `arm` through `run_suite` and `_run_sessions`; build env per arm. In `filterForMellum`, add `keepSystem`; when true, keep the incoming system message instead of replacing it.

- [ ] **Step 4: Run tests**

Run: `uv run python -m pytest learn/code/tests/test_harness.py -q` and `node --test tests/mellum-worker.test.mjs`.
Expected: PASS.

- [ ] **Step 5: Commit**

### Task 4: Aggregate evidence

**Files:**
- Create: `learn/code/evidence.py`
- Test: `learn/code/tests/test_evidence.py`

**Interfaces:**
- Produces: `learn/code/evidence.py <runs-dir> [--suite] [--arm]` prints the Markdown table from `run.json` files.
- Produces: `—` for a missing metric.

- [ ] **Step 1: Write failing tests**

Create two fake `run.json` files; assert the table has the columns, means over n, Passes as `2/3`, and `—` for an absent context.

- [ ] **Step 2: Run and see it fail**

- [ ] **Step 3: Implement**

Read `run.json`; group by suite and arm; mean the numeric fields; never read `final_reply`.

- [ ] **Step 4: Run tests**

Run: `uv run python -m pytest learn/code/tests/test_evidence.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

### Task 5: Getting Started lesson 5 is mechanics only

**Files:**
- Modify: `learn/getting-started/worker-extension.md`
- Test: `tests/learn-site.test.mjs`

- [ ] **Step 1: Write the failing test**

Assert the page contains `registerCommand`, `pi.on`, `before_provider_request`, `tool_call`, `agent_before_settle`, and `Evidence of the solution` is **not** required here; assert it does not contain the old ditch heading or “What it did”.

- [ ] **Step 2: Run and see it fail**

- [ ] **Step 3: Rewrite the page**

Teach: extension factory, command registration, events/callbacks, the three levers, a minimal `/mellum` smoke. Remove the ditch run. No Lesson 6.

- [ ] **Step 4: Run site tests and build**

Run: `node --test tests/learn-site.test.mjs` and `uvx zensical build`.
Expected: PASS.

- [ ] **Step 5: Commit**

### Task 6: Basic Remedies module and template

**Files:**
- Modify: `learn/lessons/index.md`
- Modify: `learn/lesson-template.md`
- Modify: `learn/about/how-to-read.md`
- Test: `tests/learn-site.test.mjs`

- [ ] **Step 1: Write failing tests**

Assert the index has `Basic Remedies`, names prompt/nudge/loop, and no combined “Guards for empty turns and loops” item. Assert the template has `### Evidence of the solution` and the metric columns.

- [ ] **Step 2: Run and see them fail**

- [ ] **Step 3: Write the docs**

Group the index into Start here, Basic Remedies, Prompt and project, Loop and handoff, Context and cost. Keep six steps; add the Validation subsection and the metric table to the template.

- [ ] **Step 4: Run tests**

Run: `node --test tests/learn-site.test.mjs`.
Expected: PASS.

- [ ] **Step 5: Commit**

### Task 7: Run the evidence

**Blocked on Paul’s explicit approval to start llama.cpp.**

**Files:**
- Create: `docs/superpowers/research/2026-10-21-basic-remedies-runs.md`
- Modify: `learn/lessons/primary-agent.md`
- Create: `learn/lessons/prompt.md`, `learn/lessons/empty-turn.md`, `learn/lessons/loop-breaker.md`

- [ ] **Step 1: Start the backend and run a one-session smoke per arm**

Run: `uv run scripts/backend.py start`; run each arm once on easy; verify the arm is what it says.

- [ ] **Step 2: Run the evidence**

For each arm and suite: `uv run learn/code/harness.py run --suite easy --arm worker --repeat 3`; repeat for medium/hard and all arms. Record the run directories.

- [ ] **Step 3: Aggregate**

Run `uv run learn/code/evidence.py <runs-dir>`; paste the tables. Never hand-edit a number.

- [ ] **Step 4: Write the four lessons**

Primary: bare vs worker. Prompt: worker vs no-prompt. Empty turn: worker vs no-nudge. Loop: worker vs no-loop. Use the six steps and the table.

- [ ] **Step 5: Verify**

Run `npm test`, docs caps, ladder tests if touched, and `uvx zensical build`.

- [ ] **Step 6: Commit**

### Task 8: Close the phase

**Files:**
- Modify: `ROADMAP.md`, `CHANGELOG.md`

- [ ] **Step 1: Update the LC.11A row and `## Now`**
- [ ] **Step 2: Reconcile the changelog**
- [ ] **Step 3: Run the full checks**
- [ ] **Step 4: Archive the plan with `## Result` and merge**


## Result

The harness now copies a suite’s `base/`, runs five arms, records the six
telemetry metrics and writes `run.json`; `evidence.py` produces the table.
Getting Started lesson 5 teaches extension mechanics, the template carries
the evidence table and code sample, and the glossary is automatic.

The 45-session screen was recorded and the Basic Remedies module was dropped:
the prompt and loop were null, the nudge was a lead, and hard floored every
arm. The shipped full worker is now called the **Baseline Worker**, with
**Baseline Pi** as its comparison; `learn/lessons/baseline.md` records the
n=3 bundle result. No Basic Remedies lesson pages were written.
