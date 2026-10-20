---
phase: LC.8
cycle: 1
lifecycle: active
---

# LC.8 One Pi worker implementation plan

**Goal:** The pi-subagents Worker and its records are gone, Mode is renamed
Mellum Worker, and `/mellum` behaves as before.

**Spec:** [One worker](../specs/2026-10-20-one-pi-worker-design.md).

## Global Constraints

- What Mellum receives is unchanged: prompt, tools, guards, sampling.
- `/mellum` and the extension's run-record path stay; Worker records stop
  being written and read.
- Measured records in `docs/ladder/` are not touched.
- Every removal takes its tests with it; the removal itself gets a test.
- OpenCode is LC.8A, not this cycle.

### Task 1: Rename the extension and the term

**Files:** `extensions/mellum-mode.ts` → `mellum-worker.ts`; `package.json`;
`extensions/*.ts` prose; `templates/pi/*`; `tests/*.test.mjs`; `CHANGELOG.md`.

- [ ] Rename the file and the `pi.extensions` path; replace "Mellum Mode"
      with "Mellum Worker" in code comments, tests and templates, keeping
      `/mellum` and every env var.
- [ ] Run `npm test`; the extension and hooks tests pass with the new name.
- [ ] Commit `refactor(lc8): Mellum Mode becomes Mellum Worker`.

### Task 2: Delete the subagent and its records

**Files:** delete `templates/pi/mellum-worker.agent.md`, `build.mjs`,
`scripts/render-agent.mjs`, the skill's phase 5 and its `05-worker-*`
references, the intercom references, the guard writer and the `learn`/`last`
reader branches; delete `tests/fixtures/worker/`,
`tests/mellum-record.test.mjs`, `tests/templates.test.mjs` and the worker
cases in `mellum-learn`/`mellum-last`/`skill`.

A first pass showed the cascade: `render-agent.mjs` imports `build.mjs`, the
skill's phase table names `05-worker-pi.md`, and the record writer's types
reach `mellum-record.ts`, `learn` and `last`. Remove them together, or the
skill test, the record tests and the link check fail at once.

- [ ] Add a test that the subagent template, the skill phase and the
      `kind: "worker"` branch are absent.
- [ ] Delete the surface and the writer; keep the extension's own records.
- [ ] Commit `refactor(lc8): one worker, no subagent`.

### Task 3: Delete the ladder's delegated mode

**Files:** `ladder/ladder/run_ladder.py`, `summarize.py`, `pi_profile.py`,
`ladder/tests/*`, `docs/recipe.md` where it describes delegated mode.

- [ ] Remove `delegated` from the mode choices, the mirror-profile path, the
      subagents config and revision, and the summarize columns; keep direct,
      primary and mode.
- [ ] `cd ladder && uv run pytest -q` passes.
- [ ] Commit `refactor(lc8): remove the ladder's delegated mode`.

### Task 4: Docs and close

- [ ] README: one host, one worker; remove the Worker/OpenCode rows and the
      subagent instructions; keep the measured tables.
- [ ] Skill: remove the agent-file and intercom phases.
- [ ] Changelog under `[Unreleased]` and the version decision recorded.
- [ ] `npm test`, docs caps, `uvx zensical build`; `## Result`, archive,
      `## Now` → LC.8A.
