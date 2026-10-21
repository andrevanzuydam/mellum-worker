---
phase: LC.9
cycle: 1
lifecycle: closed
---

# LC.9 The worker-extension lesson

**Goal:** Lesson 5 teaches the Pi extension and `/mellum` as the vehicle, with a live ditch session, and makes the extension usable on llama.cpp.

- [x] The extension falls back to the session's model when the shipped oMLX model is absent; test added.
- [x] The three ditch prompts run through `/mellum` in one bounded session.
- [x] `learn/getting-started/worker-extension.md`, index, nav, README, how-to-read and tests.
- [x] Changelog, roadmap and close.

## Result

2026-10-20. Shipped on `lc9`: the lesson, the fallback, and the live session.
The worker produced a Python package and three tests; one is `assert True`,
and the CLI seeds demo data instead of booking, so the vehicle moved the
ditch rather than closing it. n = 1. `npm test` 311/311, docs caps, build.
