---
title: The Challenge
---

# The Challenge

You have run a small model, built a harness and read what goes wrong. Now
prove it: point your setup at the same three projects every lesson is measured
on, and see how far it gets.

![A small robot on a winners' podium with bronze, silver and gold medals](../assets/illustrations/challenge.webp){ .illustration }

## The three levels

Each level is the same AgentClinic web app at a bigger scope. A hidden grader
runs after your session ends, so the model cannot see or edit what it is
judged on.

<div class="grid cards" markdown>

-   **Bronze**

    ---

    One prompt: build the home page. **4 hidden checks.** A good first
    target: a setup that holds together passes it in minutes.

-   **Silver**

    ---

    Four prompts, one per phase of a growing app. **18 hidden checks.** The
    model has to keep earlier phases working while it adds new ones.

-   **Gold**

    ---

    Eleven prompts: an archive, an audit trail, a SQLite database and
    reports. **34 hidden checks.** No setup measured here has passed it yet.

</div>

## The score to beat

The [suite baseline](../lessons/easy/baseline.md) is the reference: three
sessions per level on llama.cpp, with the same Mellum model you set up in
[Getting Started](../getting-started/index.md). The last row is the replicable
baseline: the same model at full precision on a rented GPU, rebuilt with
`scripts/baseline/baseline.py`.

| Setup | Bronze | Silver | Gold |
| --- | --- | --- | --- |
| Pi on its own | 0/3 | 0/3 | 0/3 |
| The Baseline Worker | 1/3 | 2/3 | 0/3 |
| Pi on its own, BF16 on vLLM (the replicable baseline) | 1/3 | 1/3 | 0/3 |

A pass means every hidden check passed. Anything less is a fail, and the
record tells you which checks were missing and why.

## Attempt it

You need the [Getting Started](../getting-started/index.md) setup: a local
model, Pi and the harness. Then run a level, three times:

```bash
uv run python learn/code/harness.py run --suite easy --repeat 3 --grade
```

Bronze is `--suite easy`, Silver `--suite medium` and Gold `--suite hard`.
Each session gets a fresh copy of the project; the summary line says how many
of the three passed, and each session's `run.json` lists the checks it
missed.

To try your own improvement, change one thing (a prompt, a guard, a tool, a
setting), run the same level again, and compare. That is exactly how every
[lesson](../lessons/index.md) is built.

## Tips

- Start with Bronze. If it does not pass, the problem is in the setup, not the
  model's ambition; [Troubleshooting](../getting-started/troubleshoot.md)
  covers the usual causes.
- Read the trace, not only the score: [Pathologies](../pathologies.md) names
  the ways a small model goes wrong, and most failed sessions show one of
  them.
- Compare like with like: the same level, the same number of sessions, one
  change at a time.
