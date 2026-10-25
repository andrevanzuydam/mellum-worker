# Record: lessons 1 and 2 on llama.cpp, easy; medium blocked

Date: 2026-10-24. Preregistered in
[the lessons 1 and 2 preregistration](2026-10-24-lessons-1-2-preregistration.md)
before the run. LC.13A, task 4.

**Outcome.** Both pairings are **null** on easy at n=3, and **medium was not
measurable**: every medium session in both arms ran the full 600 s deadline
while still issuing requests. One instrument bug surfaced: the nudge column
counted a prompt boundary as a nudge.

The substantive result is against the pages. **`bare` passed a session**, so
the primary agent is not ruled out on this suite; lesson 1's 8/15 cannot be
re-based as a contrast, only retired. Lesson 2 stays a null, as the 45-session
record found, which is now its second sample saying so.

## What ran

Backend `llama-server` 0.7.0 (build 11669), Mellum 2.1 `Q4_K_M`, `-c 50000`
(`n_ctx` 50,176), the learner's profile. Runner
`uv run python learn/code/harness.py run --suite <suite> --arm <arm> --repeat 3
--grade`, default 600 s deadline.

| Suite | Arm | Run | Passed | Requests | Peak input | Facts | Wall | Ended on |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| easy | `bare` | `47182f` | **yes** | 20 | 1,589 | 0 | 189 s | `agent_settled` |
| easy | `bare` | `877b94` | no | 20 | 2,980 | 0 | 179 s | `agent_settled` |
| easy | `bare` | `5a524d` | no | 18 | 1,589 | 0 | 90 s (600 s actual) | `tool_call`, DEADLINE |
| easy | `worker` | `5b2463` | **yes** | 21 | 1,639 | 21/21 | 185 s | `agent_settled` |
| easy | `worker` | `ff8837` | no | 22 | 33,443 | 22/22 | 275 s | `agent_settled` |
| easy | `worker` | `1551c8` | **yes** | 52 | 3,404 | 52/52 | 405 s | `agent_settled` |
| easy | `no-prompt` | `403634` | **yes** | 45 | 20,773 | 45/45 | 486 s | `agent_settled` |
| easy | `no-prompt` | `40ba24` | no | 26 | 4,762 | 26/26 | 419 s | `agent_settled` |
| easy | `no-prompt` | `a9d2bb` | no | 26 | 4,853 | 26/26 | 179 s | `agent_settled` |
| medium | `bare` | `b0b7ab` | no | 59 | — | 0 | 557 s (600 s actual) | `provider_request`, DEADLINE |
| medium | `bare` | `bb08cf` | no | 50 | — | 0 | 594 s (600 s actual) | `provider_request`, DEADLINE |
| medium | `bare` | `5510f5` | no | 39 | — | 0 | 559 s (600 s actual) | `provider_request`, DEADLINE |
| medium | `worker` | `45e579` | no | 55 | — | 55/55 | 600 s | `provider_request`, DEADLINE |
| medium | `worker` | `c9c850` | no | 49 | — | 49/49 | 600 s | `provider_request`, DEADLINE |
| medium | `worker` | `a3c016` | no | 51 | — | 51/51 | 600 s | `provider_request`, DEADLINE |

Facts are counted as requests whose payload carries `Project facts:`. `bare`
records 0 because it loads no extension; both other arms record every request.

## Pairing 1: the primary agent is not ruled out

`bare` 1/3, `worker` 2/3. Rule 1 required `bare` to pass nothing, so it does
not fire; rule 2 does. **The page cannot say the bounded worker passes where
the primary agent does not.** What it can say is the opposite of the oMLX
claim: on the easy suite at n=3, an unbounded Pi passed once, and its own
sample is too small to separate it from the worker.

Two details matter for the page. `bare`'s peak was 1,589–2,980 tokens against
the worker's 1,639–33,443, so the unbounded arm was not spending more context;
its failures were ordinary, and one of them was a hang (`5a524d` ended on a
`tool_call` with 510 s of silence before the kill). `worker`'s `ff8837` reached
33,443 tokens, 173 below Pi's 33,616 compaction trigger, and recorded no
`before_compact` row — consistent with the context arm's finding that the
refusal is not the overflow's cause.

## Pairing 2: the prompt stays null

`worker` 2/3, `no-prompt` 1/3 — one session apart, so rule 4: **null**,
matching the 45-session record's 3/9 against 3/9. The prompt did carry the
context difference the record described in the other direction this time
(`no-prompt` peaked at 20,773 against the worker's 3,404 in its passing
session), which is one session, not a pattern. The page keeps its null and
names n.

## Medium is not measurable at this deadline

`worker` took a majority of easy, so the staircase ran medium for the arms at
hand. All six sessions died at 600 s with 5–42 s of silence after their last
row, walls of 557–600 s, and were still issuing requests — slow work, not a
stall. The 45-session record ran medium `bare` at 359 s and `worker` at 204 s,
so this machine is roughly 1.7–3× slower — and **correction, 2026-10-25**: it is
not a slow day but a different machine. The 45-session record and the backend
measurements were taken on an **M5 Max, 128 GB**; every run in these records ran
on an **M1 Pro, 8 cores, 32 GiB**, which is the whole explanation for medium not
fitting 600 s. Peak token counts transfer between machines; walls do not, and no
wall here may be compared with an M5 Max wall.

Because `bare` and `worker` both time out, a medium contrast between them
would be an artefact of the deadline rather than a policy difference, so
`no-prompt` medium was not run: the pairing is void on medium whatever it
would show. No medium claim is made for either lesson, and the staircase stops
here. Raising the deadline is a decision for a day with a known machine speed,
fixed in advance — not a post-hoc rescue of this arm.

## Instrument bug: a prompt boundary is not a nudge

`45e579` was reported as `1 nudges`, which would have been the first nudge
fire recorded on llama.cpp. It is not one. Medium runs four prompts as four
Pi processes (row 55 of that trace is a second `instance_start`), and the
harness counted *any* later `provider_request` as continuing an empty turn —
so the empty final that ended prompt 2 was continued by prompt 3.

The count is now segmented by `instance_start`: an empty turn is a nudge only
if another request follows **inside the same process**. Two tests pin it, one
for each side, and the guard arm's void reading on easy is unaffected — easy
is one prompt, where the old and new rules agree. The medium runs above are
reported with the old column and carry no nudge claim.

## What would falsify this

A `bare` session whose payload carries `Project facts:` would mean the
extension loaded in the wrong arm. A medium session that finishes inside
600 s on this machine would mean the deadline explanation is wrong and the
suite could be compared. A `before_compact` row in `ff8837` would change the
context reading.

## Risks

One suite of one task at n=3; `bare`'s single pass is one session. The
machine's speed drifted during the run itself, which is why the medium column
is reported and not used. Nothing here transfers to the hard suite, to oMLX, or
to a rate.

**Raw evidence.** Published: [research-2026-10-24](https://github.com/pauleveritt/mellum-worker/releases/tag/research-2026-10-24) holds 34 run
directories — `run.json`, `trace.jsonl`, the `layout.json` reading where the
file-set check ran, and `prompt.txt` — with `workspace/` and `profile/`
excluded, because the first is a copied virtualenv and the second holds local
credentials. Nothing is committed to git.
