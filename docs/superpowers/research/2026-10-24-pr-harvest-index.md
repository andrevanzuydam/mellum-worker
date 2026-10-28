# PR harvest index

Date: 2026-10-24. Status: source map, not a new claim.

## What is measured

This note links the existing PR digests and record sets. It adds no run.

- [PR #1 and PR #2 ideas](2026-10-20-pr-digest.md), ten candidates and
  support items.
- [PR #1 recovery ledger](2026-10-24-pr1-digest.md), accepted, pending and
  rejected parts.
- [Prompt v6–v11 triage](2026-10-24-prompt-v8-v11-triage.md).
- [PR #3 and PR #4 candidates](2026-10-21-andre-follow-up-digest.md), ten
  potential lessons plus support.
- [Andre's LESSONS/THEORIES map](2026-10-24-andre-lessons-map.md).

## What is conjecture

The destination column is a curriculum decision, not evidence. PR-only
records stay `screen` until their record lands on `main`.

## Lesson map

| ID | Candidate | Research | Destination |
| --- | --- | --- | --- |
| L1 | The primary agent is the wrong worker | [Paul #1](2026-10-20-paul-findings-digest.md#1-the-primary-agent-is-the-wrong-worker) | LC.10, done |
| L2 | A short prompt, not a procedure | [Paul #2](2026-10-20-paul-findings-digest.md#2-a-short-prompt-not-a-procedure) | LC.11, done |
| L3 | Thinking is working memory | [Paul #3](2026-10-20-paul-findings-digest.md#3-thinking-is-working-memory) | LC.12, done |
| L4 | Guards for empty turns and loops | [Paul #4](2026-10-20-paul-findings-digest.md#4-guards-for-empty-turns-and-loops) | LC.13, next |
| L5 | Project facts | [Paul #5](2026-10-20-paul-findings-digest.md#5-project-facts) | LC.14 |
| L6 | Write only the files you list | [Paul #6](2026-10-20-paul-findings-digest.md#6-write-only-the-files-you-list) | LC.15 |
| L7 | Who holds the loop | [Paul #7](2026-10-20-paul-findings-digest.md#7-who-holds-the-loop) | LC.16 |
| L8 | A prose brief stops at its first reply | [Paul #8](2026-10-20-paul-findings-digest.md#8-a-prose-brief-stops-at-its-first-reply) | LC.17 |
| L9 | The intercom block is a prefill tax | [Paul #9](2026-10-20-paul-findings-digest.md#9-the-intercom-block-is-a-prefill-tax) | LC.18 |
| L10 | One spec file per phase | [Paul #10](2026-10-20-paul-findings-digest.md#10-one-spec-file-per-phase) | LC.19 |
| A1 | The worker moves its own goalposts | [Andre #1](2026-10-21-andre-follow-up-digest.md#1-the-worker-moves-its-own-goalposts) | LC.20 after LC.5 |
| A2 | Implement the whole spec | [Andre #2](2026-10-21-andre-follow-up-digest.md#2-implement-the-whole-spec) | LC.22 after LC.5 |
| A3 | The mediated test clears rungs 6–9 | [Andre #3](2026-10-21-andre-follow-up-digest.md#3-the-mediated-test-clears-rungs-69) | LC.21 after LC.5 |
| A4 | Mediation is a completeness gate | [Andre #4](2026-10-21-andre-follow-up-digest.md#4-mediation-is-a-completeness-gate) | LC.23 after LC.5 |
| A5 | Rungs 10–12: what the hard gates catch | [Andre #5](2026-10-21-andre-follow-up-digest.md#5-rungs-1012-what-the-hard-gates-catch) | [backlog](../../../BACKLOG.md); no phase |
| A6 | Context search for large code | [Andre #6](2026-10-21-andre-follow-up-digest.md#6-context-search-for-large-code) | INT.3 candidate |
| A7 | Skeptical rethink | [Andre #7](2026-10-21-andre-follow-up-digest.md#7-skeptical-rethink) | INT.3 candidate |
| A8 | Documents and images as inputs | [Andre #8](2026-10-21-andre-follow-up-digest.md#8-documents-and-images-as-inputs) | INT.3 candidate |
| A9 | Live control and replay | [Andre #9](2026-10-21-andre-follow-up-digest.md#9-live-control-and-replay) | INT.3 candidate |
| A10 | Next-concept verify | [Andre #10](2026-10-21-andre-follow-up-digest.md#10-next-concept-verify) | INT.3 candidate |
| P1 | The runaway search | [prompt triage](2026-10-24-prompt-v8-v11-triage.md), [source map](2026-10-24-pr1-digest.md) | LC.7A |
| P2 | The server that never returns | [prompt v10](2026-10-24-prompt-v8-v11-triage.md), [source map](2026-10-24-pr1-digest.md) | LC.7A |
| P3 | The rule it knew and skipped | [prompt v11](2026-10-24-prompt-v8-v11-triage.md), [source map](2026-10-24-pr1-digest.md) | LC.7A |

## PR #1 ideas not promoted

The older [PR digest](2026-10-20-pr-digest.md) carries ten ideas. The ones
not represented by L1–L10 or P1–P3 stay support or backlog, not lessons:

- fixed-test-only completion → mediation, A3;
- greedy retry and timeout → guard/loop work, not a new lesson;
- retry with no real failure → backlog;
- thinking-off shallow → L3 evidence;
- content-embedded tool call → Intermediate/backlog extension work;
- run-on tool block (negative) → drop;
- rewriting existing tests → v6 null arm, no lesson.

## Support and deferred

Every item here has a `BACKLOG.md` entry, not a lesson:

- [PR measurement support](../../../BACKLOG.md): mlx-lm, effort ramp,
  mediation scripts, rungs 10–12, `screen.sh`/`product.sh`, model halving,
  CI.
- [Dashboard and replay](../../../BACKLOG.md): the watch/steer surface.
- [Content-tool-call assist](../../../BACKLOG.md): PR #2's extension.
- [Experimental agent extensions](../../../BACKLOG.md): plan, surgical,
  quality, NCM, loop, knowledge; context/rethink/files/vision route to INT.3.
- [Tier-1 contract test](../../../BACKLOG.md): Flow's structural precursor.
- PR #3/#4 records stay on the PR branches; no page until a record lands on
  `main`.

## What would falsify this

A candidate with a record on `main` that is still marked PR-only; a lesson
with no linked research; or a roadmap entry whose link points at a source
that does not contain its claim.

## Risks

- The PR digests use different IDs. This index is the join, not a new source.
- Some records remain on PR branches; the badges must keep saying `screen`.
