# Phase 6: Rules for the parent model

This phase is always a question, never an automatic write: AGENTS.md
belongs to the user's project.

Ask: "Do you want a short delegation rule added to this project's
AGENTS.md so your main model knows when to hand work to Mellum Worker?"

If yes, append this fragment (create the file if absent, show it first):

```markdown
## Mellum Worker

Delegate to `mellum-worker` when a task is bounded: you can name the exact
files, a literal search term, the precise change, and the test command.
Put all four in the brief. It is not for exploration, design, or multi-step
plans. After it reports, run the test command yourself before trusting the
result. If it reports "produced no output", re-dispatch once with the same
brief.
```

If no, record that the user declined and move on. Check for this phase:
the user answered.
