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
`extensions/mellum-worker.ts` is the worker: `/mellum <task>` switches the
session to the worker prompt and seven file tools, runs the task, and hands
the session back. `/mellum on` and `/mellum off` keep it on across turns.

This is the vehicle the rest of the findings track improves. It changes how
the model works; it does not yet add the remedies.

## Run it on the ditch

The same three prompts, in one session, now through `/mellum`:

```bash
export PI_CODING_AGENT_DIR=$PWD/learn/code/profile
pi -p --session-id clinic --session-dir /tmp/clinic-session \
  --provider llamacpp --model Mellum2.1-12B-A2.5B-Thinking \
  --no-approve --no-extensions --no-skills --no-prompt-templates \
  --no-themes --no-context-files -e $PWD/extensions/mellum-worker.ts \
  "/mellum Build AgentClinic: a small clinic appointment app. Patients book appointments with doctors, and a doctor can see their day. Make it work."
```

Run the same command with "Now add tests and make them pass." and "Add a
command-line tool that lists a doctor's appointments for a given date."

The extension uses the shipped oMLX model when that model is in the registry;
on a llama.cpp profile it keeps the session's own Mellum model.

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
