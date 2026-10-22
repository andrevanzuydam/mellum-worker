---
phase: LC.8A
cycle: 1
lifecycle: closed
---

# LC.8A Remove OpenCode

**Goal:** The package is Pi-only: no plugin, templates, provider phase, host mode, package fields or tests for OpenCode.

**Spec:** [One worker](../specs/2026-10-20-one-pi-worker-design.md).

- [x] **Surface:** delete `opencode/`, `templates/opencode/`, the skill's `04-provider-opencode.md`, `tests/opencode-plugin.test.mjs` and the OpenCode fixtures.
- [x] **Code:** `extensions/mellum-check.ts` and `scripts/mellum.mjs` take only Pi; `package.json` drops `main`, the OpenCode description and keyword.
- [x] **Docs:** README, recipe, `docs/backends/omlx.md`, `learn/project/index.md` and the skill references stop naming OpenCode; the retired rows stay as history.
- [x] **Tests:** update `settings-source`, `mellum-check`, `mellum-cli` and `docs` to Pi only; `npm test` and `ladder/` pytest pass.
- [x] **Close:** changelog `Removed`, Status, `## Result`, archive; merge.

## Result

2026-10-20. Shipped on `lc8a`, unreleased: the OpenCode plugin, templates and
provider fragment are deleted, with the skill's OpenCode provider phase, the
`--host opencode` check, the package fields and their tests and fixtures.
`mellum-check` and `scripts/mellum.mjs` take only Pi; the README, recipe,
backend doc, project page and skill references stop naming OpenCode.

Verified: `npm test` 310/310, docs caps, `uvx zensical build`. The measured
records and the history lines that cite them are untouched.
