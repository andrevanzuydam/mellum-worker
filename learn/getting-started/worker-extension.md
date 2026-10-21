---
title: The worker extension
track: getting-started
position: 5
prerequisites: [getting-started/ditch]
authors: [Paul Everitt]
backends: [llamacpp]
---

# The worker extension

A Pi extension is a file that registers a command and hooks into the session.
`extensions/mellum-worker.ts` lets the **main agent** — the larger model you
started Pi with — hand a bounded task to **Mellum**, the small local model.
`/mellum <task>` switches the active model to Mellum, swaps in the worker
prompt and seven file tools, runs the task, then restores your main model and
hands it a compact report. `/mellum on` and `/mellum off` keep that worker
mode on or off across turns.

The point is the division of labour: the main agent decides what to delegate
and keeps the session; Mellum gets the task and only the seven file tools.
`/mellum` is not a separate subagent process. It is the same session running a
different model, prompt and tool set for the span.

This is the vehicle the rest of the findings track improves. It changes how
the model works; it does not yet add the remedies.

## Two models, one session

Start Pi normally and the model you chose is the main agent. It can read the
whole conversation and use every tool. When you type `/mellum <task>`, the
extension:

1. switches the active model to the shipped Mellum model, or leaves the
   session's model alone when it is already Mellum on llama.cpp;
2. replaces the system prompt with the worker prompt and narrows the tools to
   seven file tools;
3. hides the messages from before the command, so Mellum sees the task and the
   project facts, not the main agent's whole conversation;
4. runs the task; and
5. restores the previous model and tools, and gives the main agent one handoff
   block instead of every read, edit and test run.

That is how a large main model can use a small worker without handing over the
whole session. It is also why `/mellum` is not the main agent changing its
mind: it is the same session temporarily running a different model.

## Run it on the ditch

The same three prompts, in one session, now through `/mellum`. The wrappers
set the profile, session, model, isolation flags and extension; the task is
the only argument.

```bash
learn/code/clinic "/mellum Build AgentClinic: a small clinic appointment app. Patients book appointments with doctors, and a doctor can see their day. Make it work."
```

```powershell
.\learn\code\clinic.ps1 "/mellum Build AgentClinic: a small clinic appointment app. Patients book appointments with doctors, and a doctor can see their day. Make it work."
```

Run the same wrapper with "Now add tests and make them pass." and "Add a
command-line tool that lists a doctor's appointments for a given date."

This starts Pi on the llama.cpp Mellum model, so the main model is already
Mellum: `/mellum` changes the prompt and tools, not the model. To see the
switch from a larger main model to Mellum, start Pi on that model with the
oMLX Mellum model available. The extension uses the shipped oMLX model when it
is in the registry; on a llama.cpp profile it keeps the session's own Mellum
model.

## What it did

It produced a Python package, a `pyproject.toml`, and tests, and it reported:

> AgentClinic has been successfully built and tested … Tests pass with
> `uv run --offline pytest -q`.

That is true: three tests pass. Look inside them, though:

```python
def test_see_doctor_day():
    clinic = Clinic()
    ...
    clinic.see_doctor_day("d1", "2024-01-01")
    assert True  # If we reach here, no error
```

`assert True` cannot fail. And the command line tool has no way to book an
appointment: it seeds Alice, Bob and Dr. Smith as demo data, prints their day,
and exits. There is no saved state, so a second run can never see a booking
from the first.

## What this means

The extension moved the ditch. Base Pi wrote two files and took the host
down; the worker wrote a package with passing tests. But the tests do not
check the thing the prompt asked for, and the CLI is a demo. The failure is
quieter, not gone: **the worker can make a shape that passes without being
the thing you asked for.**

That is why the remedies come next: a prompt that asks for what the project
must do, facts that name the layout and the test command, guards for empty
turns and loops. Each is a lesson that changes this extension, and each is
measured before it ships.

## One session, one machine

n = 1, one llama.cpp profile, one session. It shows what this extension can
do, not how often. The reference record for rungs 1–5 is
[here](../../../docs/ladder/reference-llamacpp-rungs1-5/README.md).
