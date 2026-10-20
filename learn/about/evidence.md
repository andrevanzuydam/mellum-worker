# Evidence and badges

Each step of a lesson (except the Interpretation) opens with an evidence badge. The badge tells you what the step rests on — from a preregistered run to a reasoned conjecture.

## Badges

| Badge | Means | Needs |
| --- | --- | --- |
| `reference-run` | A preregistered run on Ollama, made for this lesson | A record in `docs/ladder/`, a preregistration, raw evidence in a `research-*` release |
| `cited` | An existing record on oMLX or mlx-lm | A record in `docs/ladder/` or a research note on `main` |
| `screen` | A few targeted runs or one observation | A research note, or a PR note or commit message cited by name |
| `conjecture` | No run behind it | Reasoning, design, unit tests only |

For steps 1, 2, and 4 the badge is the strongest evidence the statement rests on. For steps 3 and 5 it is the strength of the evidence itself.

## Why the backend matters

All measured evidence in this repo was originally run on oMLX (Apple Silicon). Once a lesson gets an Ollama `reference-run`, its badge will say so. Until then, a `cited` badge means the number came from oMLX or mlx-lm — your Ollama numbers may differ.

## Upgrading and downgrading a badge

Each lesson whose steps 3 or 5 are below `reference-run` gets a roadmap item for the run. When the run lands, the lesson's badge, numbers, and Interpretation change in the same commit as the record, with a dated line under the Interpretation saying what changed. A run that weakens a claim downgrades the badge the same way. A badge never changes without a linked record.

## Why a screen is a lead, not a rate

The project follows the rule: [evals are screens first, preregistered runs to decide](https://github.com/pauleveritt/mellum-worker/blob/main/docs/sdd.md). A `screen` badge means someone ran a few targeted tests and saw something worth pursuing. It is not a rate you can trust — it is a lead. Fix the arms, sample size, scoring, and the rule before runs that decide a change or claim.
