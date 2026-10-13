# Roadmap triage: fewer phases, a mediated test, one worker

Date: 2026-10-13. Written after a read-only review of the code, the ladder
and the documents on this date, at Paul's direction: cut ambition, retire the
instrument phases, keep the measured product, and leave the door open for one
steering idea. The decisions are in [`ROADMAP.md`](../../../ROADMAP.md); this
note holds the reasons so the rows stay short.

**What is measured.** Rung 4 ("make the failing test pass", three files) is
3/3 in every arm that ran it, and rung 5 passes whenever a test is named
([summary](../../ladder/ablation-summary.md)). In the Pi 1.0.2 spike the
Worker's parent wrote a behavioural red test and the child went 2/2, while
Mode asked to do TDD itself went 0/2
([results](2026-10-11-pi102-mode-worker-experiments.md)). On 2026-10-13
rung 9 (AgentClinic phase 4) failed 7 of 12 runs across four arms; every
failing run passed its own test command and failed the hidden id check
([A21](2026-10-13-a21-result.md), [screen](2026-10-13-rung9-screen.md)).
The ladder's existing checks found both that miss and the false-success
claims the M.7D dimensions were to separate.

**What is conjecture.** That a test the main model writes from a phase spec
takes rung 9 toward rung 4's rate; that the shape holds on a project the
ladder has not seen; that retiring the pi-subagents Worker loses nothing
once the mediated test exists.

## 1. What is retired

| phase | was | now | reason |
| --- | --- | --- | --- |
| M.7D | four-dimension assessment sidecar, 322-line plan | superseded, unbuilt | a second consecutive instrument-only phase after M.7C; the current scorer already separates the failures it targeted; it would relabel research, not change the worker |
| M.7E | measured bash-timeout policy | backlog | the pathology came from bare-Pi hello-world probes, a configuration the README says not to run; `Do not: start servers` and the runner's leftover cleanup cover the observed cases |
| M.8, M.9 | pi-subagents Worker one-liners; an in-process child through Pi's SDK | retired | both polish or replace the Worker, which M.12 retires |
| M.10 | mediated brief | reshaped into M.11 | a brief in prose is the shape that went wrong in other projects (four packet generations in satyrn-evals, ending in a stated negative) |
| M.3, M.4 | OpenCode measurement; Ollama backend | backlog | no measured demand; the README says the port is unmeasured |

The October 11 session produced 14 research notes and three phases about
Mellum as a bare primary agent. Its evidence stays where it is; it no longer
drives the roadmap.

## 2. The mediated test (M.11)

The main model turns a request or a spec phase into a failing test, shows
it, confirms it fails on the current tree, and hands it to Mellum as "make
this pass". The user or the main model reruns the test afterwards. This is
domain engineering: the developer's work is specs and tests, and the
guardrail is an executable oracle rather than a prose contract.

Why this rather than a brief: a packet is prose the host parses and trusts.
A test cannot fail open. It is red before dispatch and green after, the user
reads pytest rather than a schema, and the request is never rewritten, only
given an oracle. The leash is built in: show it, run it red, record it beside
the request. The same command is the second-time fix: when an acceptance
test fails after a run, the failing test is the re-dispatch.

The Phase 4 id miss is the worked example. The spec's "Tests:" line never
asks for the id, so Mellum's own tests define done, pass, and the hidden
test disagrees. A test written from the spec names it. The lead that the id
miss follows the one-file roadmap (5 of 6 against 1 of 6, n = 3 per arm) is a
second-order question and is not pursued before this one.

Order: a screen first (rung 9, three runs, a test written from the Phase 4
spec as a user would, scored by today's hidden tests and write list), then a
preregistered run on rungs 6–9 against A21 if the screen moves it, then a
spec for the Mode command.

## 3. One worker (M.12)

Mode is already the exit from pi-subagents. The Worker's one unique value is
the parent's scoping and its independent test run; M.11 gives Mode the same
through the test. M.12 then retires the Pi Worker (agent template, child-only
guard loading, Worker run records) and renames the extension and the term:
`mellum-mode` becomes `mellum-worker`, which the package is already called.
`/mellum` stays. The OpenCode port keeps its Worker subagent as shipped,
unmeasured, on the backlog.

## What would falsify this

- The rung 9 screen with a written test still misses the id at a similar
  rate: the lever is not the test, and M.11 stops at the screen.
- A preregistered run on rungs 6–9 below A21's 9/12: the test constrains
  Mellum more than it helps, and the README's by-hand recipe is withdrawn.
- A Worker run record shows a task Mode with a test cannot do: M.12 waits.

## Risks

- The main model writes a wrong or over-specified test; it is shown and
  recorded, and the preregistered run reads it as part of the arm.
- Writing the test moves cost to the main model; the run measures requests
  and wall time on both sides.
- Retiring the Worker removes `kind: "worker"` records; `learn` keeps
  reading old ones.
