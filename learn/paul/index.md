# Paul's findings

Lessons from the mellum-worker phases M.1–M.7 and the A-series ablations.
Each is one idea from the [digest](https://github.com/pauleveritt/mellum-worker/blob/main/docs/superpowers/research/2026-10-20-paul-findings-digest.md),
follows the six steps, and is its own phase. They are independent: each
lesson lists its prerequisites, [Getting started](../getting-started/index.md)
is the only one unless a lesson says otherwise, and you can read them in any
order.

## Lessons

1. **[The primary agent is the wrong worker](primary-agent.md)** (LC.10) — Bare Pi passes 8 of 15 rungs; the same model as a bounded worker passes 15.
2. **[A short prompt, not a procedure](short-prompt.md)** (LC.11) — Prompt v5 is 643 characters, and each line it lost had a run behind it.
3. **Thinking is working memory** (LC.12) — Stripping earlier thinking cuts prefill 57% and makes the run slower.
4. **Guards for empty turns and loops** (LC.13) — Without the nudge and the breaker, two of fifteen runs end with nothing.
5. **Project facts** (LC.14) — A 600-character facts section takes a four-phase build from 1/12 to 9/12.
6. **Write only the files you list** (LC.15) — Runs pass the hidden tests and still fail by writing outside the layout.
7. **Who holds the loop** (LC.16) — Worker, Mode and a delegated child pass alike and cost differently.
8. **A prose brief stops at its first reply** (LC.17) — The same brief as one prompt loses four passes; as steps it costs 2.4x the time.
9. **The intercom block is a prefill tax** (LC.18) — Off: the child prompt halves and prefill drops 20%, with the same passes.
10. **One spec file per phase** (LC.19) — A one-file roadmap misses the last phase's id in 5 of 6 runs; n = 3.

The order above is a recommendation, not a dependency chain: the baseline
first, then the prompt, then the behaviours, then the shapes that make more
sense once those are known.
