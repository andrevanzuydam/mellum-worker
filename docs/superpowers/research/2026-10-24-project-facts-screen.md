# Record: project facts on llama.cpp, easy

Date: 2026-10-24. Preregistered in
[the project-facts preregistration](2026-10-24-project-facts-preregistration.md)
before the run. Phase LC.13A, task 4, first arm.

**Outcome.** On passes, **null**: `worker` took 1 of 3 and `no-facts` 0 of 3,
one valid session apart, and `worker` lost one session to contamination. The
injection count behaved exactly as designed — the block appears in every
`worker` request and in none of `no-facts` — so the arm measured what it said
it would and found no pass-rate effect at n=3.

The arm did produce a lead it was not built for: **all three `no-facts`
sessions ended on a foreground server command that never returned**, one of
them the same `uvicorn app:app --reload` shape as the index's pathology #22,
"The server that never returns". The bullet the arm removed is
`- Do not: start servers`.

## What ran

Backend `llama-server` 0.7.0 (build 11669), Mellum 2.1 `Q4_K_M`, `-c 50000`
(`n_ctx` 50,176), `127.0.0.1:8002`, the learner's profile. Runner
`uv run python learn/code/harness.py run --suite easy --arm <arm> --repeat 3
--grade`. Medium was not run: `worker` did not take a majority of easy.

| Arm | Run | Passed | Requests | Injected | Peak input | Tool errors | Wall | Ended on |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `worker` | `9d5483` | yes | 26 | 26/26 | 857 | 5 | 316 s | `agent_settled` |
| `worker` | `6e3209` | no | 22 | 22/22 | 13,813 | 2 | 199 s | `agent_settled` |
| `worker` | `7009b6` | **invalid** | 11 | 11/11 | 19,721 | 1 | 592 s | `provider_request`, contaminated |
| `no-facts` | `0f2dc0` | no | 17 | 0/17 | 857 | 2 | 139 s (600 s actual) | `tool_call` |
| `no-facts` | `e3136d` | no | 48 | 0/48 | 880 | 17 | 400 s (600 s actual) | `tool_call` |
| `no-facts` | `64c6ec` | no | 51 | 0/51 | 758 | 11 | 457 s (600 s actual) | `tool_call` |

`7009b6` is excluded under the preregistration's contamination clause: the
grader was touched during the run. Its pass count is therefore 1 of 2 valid
`worker` sessions, not 1 of 3.

## The block reached the model

This arm began with a false zero. The first three `worker` sessions counted
**zero** injections across 79 requests, and the cause was the instrument, not
the worker: the recorder had been loaded *before* the worker extension, and
Pi runs `before_provider_request` handlers in load order, each able to replace
the payload, so every logged payload was the pre-rewrite one. With the
recorder back after the worker, the block appears in 26/26, 22/22 and 11/11
requests, and its text is the shipped one:

```
Project facts:
- Test command: uv run --frozen python -m pytest tests
- Run Python commands with uv run --frozen.
- Use existing dependencies and test configuration.
- Keep changes scoped to the task; do not weaken existing tests.
- Before reporting completion, run the test command and report its result.
- Do not: start servers
```

The three discarded sessions are not counted anywhere above. They are named
because the failure they caused is the phase's most expensive kind: an arm
that would have been recorded void while the policy under test was working
perfectly.

## On passes: null

Rules 1 to 4 do not fire. The block injects (rule 1 out); `no-facts` does not
match `worker`, it is behind (rule 2 out); `worker` is ahead by one valid
session, not two (rule 3 out); no `no-facts` payload carries the block (rule 4
out). Rule 5 applies: **null**, with both counts stated.

That is the weakest useful result and it is reported as one. It does not say
the facts block is useless; it says the delivered block did not move this
suite's pass count at n=3, which is exactly what oMLX could not tell us
either, because the oMLX claim (1/12 to 9/12) was a four-phase build, not one
phase.

## The lead the arm found

Every `no-facts` session ended the same way: a foreground server command, a
`tool_call` row with no `tool_result` after it, then silence until the
harness killed the child at 600 s.

| Run | Last command | Silence before the kill |
| --- | --- | --- |
| `0f2dc0` | `uv run uvicorn app:app --reload --port 8001` | 460 s |
| `e3136d` | `uvicorn app:app --reload --port 8001` | 200 s |
| `64c6ec` | `uv run --offline python app.py` | 143 s |

The same day's `worker` sessions do reach for servers — `pip install uvicorn`,
`python -c "import uvicorn"`, and one `python app.py > app.log 2>&1 &` — and
none of them ended a run, and the one that started the app backgrounded it.
So the difference is not "servers" but "foreground and never returning", and
the natural hypothesis is that the missing bullet is
`- Do not: start servers`.

**That hypothesis is not tested here.** One arm, one difference, n=3, on a
machine that was also running slower than earlier in the day. What the record
supports is a preregistration, not a claim: an arm whose reading is hung tool
calls, where the `worker` block is compared against the same block with only
that bullet removed.

**Attribution, because it decides a gate.** The pathology is **Andre's**:
index P2, "The server that never returns" ([lesson map](2026-10-24-pr-harvest-index.md)),
from his PR #1 via prompt v10 `4666612` ("never start a foreground server; use
`TestClient`"), and it is deferred to **LC.7A**. The bullet this arm removed
is **Paul's** — it sits in the suites' own `AGENTS.md` from the LC.3A
fixtures — and the measurement above is this phase's. So the arm may run now
as evidence, but nothing here may publish as Andre's page before LC.5 records
his linkable consent, and LC.7A is scheduled after LC.19. A purpose-built
foreground-server guard already exists and is dormant (`420ba1d`, branch
`lc11b-server-guard`), which makes the next arm three-way: the facts bullet as
shipped, that guard, or both.

## A gap in the preregistration

There was no rule for "the session ends on a tool call that never returns".
The rules covered invalid arms, injection and passes, and a request that
stalls (the context arm's finding), but not a *tool* that stalls. The harness
reports these as an ordinary `FAIL` with the wall it can see, which is why
139 s, 400 s and 457 s sit under three 600 s kills. Recorded here rather than
patched afterwards, as the guard screen did for its own gap; the wall
under-report is in [the backlog](../../../BACKLOG.md).

## What would falsify this

A `no-facts` session that finishes without a foreground server command would
weaken the lead. A `worker` session that hangs on a foreground server command
would break it outright, because the bullet is then not doing the work. A
re-read of the traces that shows a `tool_result` after any of those three
calls would make the "never returned" reading wrong.

## Risks

n=3, one suite, one machine, and a day on which easy's walls grew from
190–377 s to 316–592 s between arms. The pass counts are thin and the lead is
thinner; neither is a rate. Nothing here transfers to oMLX or to the hard
suite, and nothing here changes the worker, the prompt or the guard.

**Raw evidence.** Published: [research-2026-10-24](https://github.com/pauleveritt/mellum-worker/releases/tag/research-2026-10-24) holds 34 run
directories — `run.json`, `trace.jsonl`, the `layout.json` reading where the
file-set check ran, and `prompt.txt` — with `workspace/` and `profile/`
excluded, because the first is a copied virtualenv and the second holds local
credentials. Nothing is committed to git.
