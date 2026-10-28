# The foreground-server guard arm: nothing to refuse, no measurable cost

Date: 2026-10-26 (sessions stamped 2026-10-27). Preregistration:
[2026-10-26-server-guard-preregistration.md](2026-10-26-server-guard-preregistration.md).

**What is measured.** Whether refusing a foreground server start costs a run
anything on the medium suite, and whether it had anything to refuse. Two arms at
n = 3: the Baseline Worker as shipped, and the same worker with
`blockForegroundServer` on.

**What is conjecture.** That the guard would matter on a task that invites a
server; that the refusal's retry loop is costly in a full session; that the same
arm on a thin-brief task would fire where this one did not.

## What ran

Six sessions, both arms, no censors — every session ended `agent_settled`, none
hit the deadline, none was contaminated, none wrote outside the layout.

| Arm | Session | Missing | Checks ran | phase 1/2/3/4 missing | Requests | Tool errors | Wall | Guard fires |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| worker | `799f7a` | 7 | yes | 0 / 1 / 2 / 4 | 63 | 4 | 1116 s | 0 |
| worker | `590359` | 18 | **no** | — | 16 | 0 | 867 s | 0 |
| worker | `9ccf03` | 9 | yes | 1 / 2 / 2 / 4 | 99 | 16 | 1797 s | 0 |
| server-guard | `a25b9e` | 5 | yes | 0 / 0 / 0 / 5 | 70 | 8 | 1044 s | **0** |
| server-guard | `f8499f` | 18 | **no** | — | 86 | 21 | 1784 s | 0 |
| server-guard | `edbcc9` | **2** | yes | 0 / 1 / 0 / 1 | 69 | 9 | 1449 s | **0** |

Passes: 0/3 in both arms. Two sessions never ran their checks: `worker`
`590359` stopped after 16 requests having written nothing, and `server-guard`
`f8499f` left a workspace its checks could not import (`quality_ok: false`).

**No session in either arm issued a foreground-server command.** Scanning all
six traces for a `bash` call that matches the guard's own pattern and is not
backgrounded finds **0** in the worker arm and **0** in the guard arm, and no
command of that shape is left without a `tool_result`. The `Do not: start
servers` bullet, the briefs' "do not check it by starting a server" line and the
seeded `TestClient` test were enough on this task.

## The rule, applied

1. No censors; the two `checks_ran: false` sessions are reported above and
   excluded from the check comparison.
2. **Cost.** Mean requests: worker 59.3, guard 75.0 — a ratio of **1.26×**,
   which the preregistered 1.25× threshold reports as a budget cost. Medians are
   63 against 70 (1.11×), and the worker mean is dragged down by `590359`'s 16
   requests, a session that wrote nothing. Mean wall is 1260 s against 1426 s
   (1.13×); median wall 1116 s against 1449 s. **The rule fires; the medians say
   it is noise.** Three sessions per arm cannot separate a five-request
   difference from session variance, and this is recorded as inconclusive rather
   than as a finding either way.
3. **Nothing to refuse.** `worker` has no guard, so its test is whether it would
   have been refused: it never issued a command that matches. Zero, in both arms.
4. **No hang to prevent.** Neither arm hung, so there is nothing the guard
   prevented here.

**Outcome: the guard is not needed on the medium suite with these briefs.** It
did not fire, did not prevent a hang, and its apparent cost is inside the noise.

## The smoke that says the guard does work

Before the arm, one throwaway run with the guard on and a prompt that *asked* for
the server — "start the server with `uvicorn app:app --reload`" — to learn how a
refusal appears in the trace:

- **12 refusals** in 48 requests, and the model adapted: `which uvicorn`, then
  `nohup … &` with a log tail, then `pytest test_app.py`.
- It also looped for about four minutes, retrying shapes of the same command,
  before it was stopped. The loop breaker did not catch it, because each retry
  was a different call.

So: a refused call leaves **no trace row** — the worker's guard stops the event
chain before the recorder's handler — which is why `guard_blocks` is counted from
the refusal the model was told about, and why that count is empty in a run where
the guard never fired. And a refusal buys adaptation at the price of retries.

## What this means

- **The guard stays dormant.** It is on `main` with its tests, `--arm
  server-guard` runs it, and nothing enables it by default. Baseline Worker v1 is
  untouched, so no lesson's baseline moves.
- **It does not ship in a Baseline Worker v2 on this evidence.** The arm that
  would justify it is a task that invites a server — a thin brief, or an
  unbounded arm — not the medium suite as it now stands.
- **LC.7A's page keeps the pathology and drops the remedy's claim.** Four hangs
  are recorded (LC.13A's three `no-facts` sessions, LC.24's two `bare` easy
  sessions, LC.19's two attempts), the briefs now name the loop that avoids them,
  and the guard is a working brake with a retry cost — not a measured remedy.

## What would falsify this

- A `worker` session that issues a foreground server command and hangs while a
  `server-guard` session completes would put the guard back on the critical path.
- A `server-guard` session with `guard_blocks > 0` that then spends its deadline
  looping would say the refusal needs a shorter alternative than the one it gives.
- A medium run in which the `Do not: start servers` bullet and the briefs'
  verification line are removed, hanging again, would say which of the three
  instructional changes is doing the work.

## Risks

- **Reading 1.26× as a cost.** It is one outlier's worth of requests inside a
  three-session sample, and the medians disagree. Any page that quotes it owes
  the medians beside it.
- **Reading "0 fires" as "the guard is useless."** It says the worker did not
  need it on this task, not that a worker never does: the smoke fired 12 times on
  a prompt that asked for a server.
- **The marker is a phrase.** `guard_blocks` counts the refusal's first sentence;
  changing that text silently zeroes the count. Both the harness test and the
  guard test pin it.

## Raw evidence

Published as
[`research-2026-10-27.tar.gz`](https://github.com/pauleveritt/mellum-worker/releases/download/research-2026-10-27/research-2026-10-27.tar.gz):
the six run directories (`run.json`, `trace.jsonl`, `layout.json`, `leaked.json`,
`prompt.txt`) and the smoke's trace, `workspace/` and `profile/` excluded,
nothing committed to Git.
