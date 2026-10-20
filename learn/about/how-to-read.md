# How to read a lesson

The center has three [tracks](../glossary.md). The **Getting started** track is in a fixed order — lesson 2 builds on lesson 1. The findings tracks (Paul's and Andre's) are lessons that stand alone: each lists its prerequisites, and you can read them in any order.

## The six steps

Every findings lesson follows the same structure:

1. **Problem** — what a small model does wrong, in one paragraph you can recognize from your own runs.
2. **Eval case** — the rung or task that reproduces the problem, and how it is scored.
3. **Evidence of the problem** — the runs that show the problem, with sample size and backend.
4. **Solution** — the change that was tried, with a link to the commit or file.
5. **Evidence it worked** — the runs that show the change helped, or did not. A negative result is still a result.
6. **Interpretation** — a short narrative: what the evidence means, how far its badges let you trust it, and what is still open.

Steps 1–5 each carry an [evidence badge](./evidence.md#badges). The Interpretation does not — it is commentary, not evidence.

## What an Interpretation is and is not

- It names the weakest badge among steps 1–5 that its conclusion relies on, and states nothing stronger than that badge supports.
- It says which backend the evidence came from when that differs from yours (Ollama).
- It ends with what is still open: the run that would upgrade the weakest badge, or the question the evidence cannot answer.
- It contains no new numbers. All data lives in steps 1–5.

## Worked example

The [PR digest](https://github.com/pauleveritt/mellum-worker/blob/main/docs/superpowers/research/2026-10-20-pr-digest.md) walks through idea 1 (the worker decides when it is done) in the six-step form. It is not yet a lesson, but it shows the structure.
