# Record: the context budget on llama.cpp, easy

Date: 2026-10-24. Preregistered in
[the context-budget preregistration](2026-10-24-context-budget-preregistration.md)
before the run, with one dated amendment that moved the compaction arm's
decision into the arms. Phase LC.13A, task 3.

**Outcome.** The arm is **void for its window question**. Six sessions across
two windows, and no request came within 28,000 tokens of either one: the peak
demand was 857 to 4,699 tokens against a 50,176 window and a 56,064 window.
The two windows were the same policy because neither was ever approached, so
the 3/3 against 2/3 is not a window effect. **No setting changed**;
`[tool.mellum] context` is back at 50,000 and the profile with it.

Two findings do stand, and they are worth more than the arm: easy's demand is
wildly variable, and a hung request is invisible in the recorded wall.

## What ran

Backend: `llama-server` 0.7.0 (build 11669), Mellum 2.1 `Q4_K_M`,
`127.0.0.1:8002`. Sampling from `learn/code/profile`. Runner
`uv run python learn/code/harness.py run --suite easy --arm worker --repeat 3
--grade`. Each window was set in `[tool.mellum] context`, served with
`scripts/backend.py stop` → `start`, mirrored into the profile with
`scripts/backend.py profile`, and confirmed at `/props` (`n_ctx` 50,176 and
56,064).

| Arm | Window | Run | Passed | Requests | Peak input | Wall | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| check (n=1) | 50,000 | `4bd757` | yes | 33 | 1,639 | 251 s | the instrument check |
| `A-50k` | 50,000 | `9a4fe1` | yes | 36 | 857 | 306 s | |
| `A-50k` | 50,000 | `a50065` | yes | 43 | 4,699 | 377 s | |
| `A-50k` | 50,000 | `c7cbb6` | yes | 24 | 857 | 190 s | |
| `B-56k` | 56,000 | `2e365f` | yes | 48 | 3,159 | 302 s | |
| `B-56k` | 56,000 | `561d76` | **no** | 23 | 857 | 164 s recorded, 600 s actual | stalled request, killed at the deadline |
| `B-56k` | 56,000 | `ac99a0` | yes | 23 | 857 | 185 s | |

**Compaction never happened and was never asked for.** Zero `before_compact`
rows in all seven runs. That is rule 5 of the preregistration: the refusal is
unreachable in this path at this n, it stays, and it may not be described as
the overflow's cause. Rule 1 fails on its own terms (`B-56k` did not pass
every session), rule 2 never had a request above 56,000 to point at, and
`C-compact` never earned a run, because the amendment made it conditional on
a `before_compact` row.

## Finding 1: easy's demand varies by more than an order of magnitude

| Sample | n | Peak input tokens |
| --- | --- | --- |
| this arm | 7 | 857, 857, 857, 857, 1,639, 3,159, 4,699 |
| the guard screen, 2026-10-24 | 10 | mean 10,423–15,352, one request at 51,697 |
| the 45-session record | 3 | mean of per-run peaks 7,834 |

Same suite, same quant, same window, same machine. Per-request input is
small — mean 160 to 280 tokens over 23 to 48 requests — so the peak is not
accumulation; it is one large request, most likely a single large tool result
inside an otherwise trimmed context. That is conjecture: the worker's
`context` handler trims the parent's history per request, which would explain
both the tiny means and the spikes, and nothing here measures the handler.

The consequence for the phase is blunt. **A lesson may not describe easy as a
task that needs a big window, and may not describe it as a task that fits
one.** What it needs is the peak-demand column beside every pass count, and
that is a change to what the Getting Started suite page teaches.

## Finding 2: a hung request does not show in the recorded wall

`561d76` recorded `"wall": 164.241`, which is exactly the span of its trace
rows — 20:38:20.071 to 20:41:04.312. Its last row is a `provider_request` with
no `message_end`, and the `deadline` file was written at 20:48:19, 435 s
later: the child sat on a request that never returned until the harness
killed it at 600 s. `report()` derives wall from trace timestamps, and a hung
request writes no rows, so the number under-reports by the whole stall.

This is why the failure reads as a fast miss instead of a backend stall, and
it is the same blind spot that would hide a stall inside any arm here. It
goes to the backlog as a harness fix (`wall` from process lifetime, or a
`deadline` marker row) rather than being patched mid-arm. The pre-deadline
tool calls — `uv install`, `uv --help`, `inspect` on two libraries — are
ordinary probing, not the cause.

## What this means for the phase

**Task 4 is no longer blocked on the context budget.** `A-50k` passed 3/3 at
the shipped 50,000 window, which the phase's own ordering assumed it would
not; the overflow that voided the guard arm has not recurred in seven
sessions across two windows. The honest statement is not "the overflow is
fixed" — nothing was changed — but "the overflow was a one-off event that
seven sessions did not reproduce, so it cannot be the premise of a task".

What is settled: the shipped window stays at 50,000 (rule 1's condition was
not met, and no evidence favours 56,000); the compaction refusal is
unreachable at this demand and keeps its place with that caveat attached; and
the guard arm's void result keeps its own explanation — the earlier reading,
that the refusal starved the run of a way down, is now **not supported**.

## What would falsify this

A session that reaches 33,616 tokens and records no `before_compact` would
mean Pi's threshold is not the one the docs describe. A session over 50,000
that passes would mean `n_ctx` is not enforced. A stall that does record a
`message_end` would mean finding 2 is a property of this one request. Any run
whose served `n_ctx` or profile `contextWindow` disagrees with its arm is
invalid.

## Risks

Seven sessions, one suite, one machine. The demand spread is a fact about
seven samples, not a distribution; the peak may reach 51,697 again tomorrow,
and no window we can serve (56,000 is the model's own maximum) would survive
it. The `length` failures from the guard screen — an output cap, not a
window — remain untouched and are a different budget.

**Raw evidence.** Per-run `run.json`, `trace.jsonl`, `stdout.txt` and
`diff.patch` are under `/tmp/mellum-eval-runs` on this machine and go to a
`research-2026-10-24` release after review, never into git.
