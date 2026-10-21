---
title: The primary agent is the wrong worker
track: paul
position: 1
prerequisites: [getting-started/worker-extension]
authors: [Paul Everitt]
backends: [omlx]
---

# The primary agent is the wrong worker

## Problem

**Badge:** `cited`

Give Mellum the whole job — the plan, the tools, the decision that it is
done — and it passes eight of fifteen small coding tasks. Give it the same
model with a broader profile and it passes ten. The same model, handed a
bounded task and a test command, passes all fifteen.

The difference is not the model. It is who holds the plan and who decides
that the work is finished.

## Eval case

**Badge:** `cited`

Ladder rungs 1–5: five small coding tasks, fifteen runs per setup, on oMLX
([summary](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/ablation-summary.md)).
The two primary baselines are
[bare Pi](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/phase0c-primary-plain/README.md)
and [the operator profile](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/phase0c-primary-operator/README.md);
the worker arm is
[A3](https://github.com/pauleveritt/mellum-worker/blob/main/docs/ladder/ablation-a3-v4b/README.md).

## Evidence of the problem

**Badge:** `cited`

| Setup | Passes | Wall, mean | Prefill per run |
| --- | --- | --- | --- |
| Bare Pi, Mellum as the main model | 8/15 | 51 s | 297k chars |
| Operator profile, Mellum as the main model | 10/15 | 72 s | 1,055k chars |
| The worker, bounded | 15/15 | 54 s | 308k chars |

The operator profile is the slowest setup on every easy rung, three to four
times bare Pi on rungs 1–3: its 17k-character system prompt and skills load
on every request. The worker costs about what bare Pi costs and passes
everything.

## Solution

**Badge:** `cited`

Do not make the model the main agent. Give it one task, seven file tools, a
test command and a stop condition; keep the plan, the context and the
checking outside.

That is what `/mellum` does in this center: the worker prompt replaces the
main prompt, the tools are narrowed, and the session comes back to you
between tasks. The extension is the vehicle; the bound is the point.

## Validation

**Badge:** `cited`

The same fifteen runs with the worker pass 15/15, at 14.3 requests per run
and 54 s wall (A3). The primary arms are 8/15 and 10/15. The comparison is
one change — who holds the loop — on the same model and the same tasks.

## Interpretation

The weakest badge here is `cited`: every number is oMLX on one machine, and
none of it is a llama.cpp measurement. Your rates will differ. What
transfers is the shape: a bounded worker with the parent holding plan and
verification, not a model that is simply better at being in charge.

What would upgrade this: a reference run of the primary arm on llama.cpp,
rungs 1–5, beside the worker reference that exists now. Until then, read the
8/15 and 15/15 as a lead from one backend, not as a property of Mellum.
