---
title: Running Commands
tier: easy
number: E6
time: 3 min read · 20 min to run
track: lessons
position: 5
prerequisites: [lessons/easy/creating-files]
authors: [Andre van Zuydam]
backends: [vllm]
---

# E6 · Running Commands

The bash tool lets the model run anything, including the app it just built, and a server started in the foreground never returns, so the session hangs until its deadline. One guard refuses a foreground server and shows the background form.

!!! abstract "Overview"

    **Questions**

    - What does `bash` give the model, and how does it hang a session?
    - How do I let the model check its app without hanging?

    **Objectives**

    - Recognise a foreground server in `run.json`'s `stalled` field.
    - Add `guard/block-foreground-server` and see the start refused with a background form.

![A small robot waiting at a closed door beside a server rack while an hourglass runs out](../../assets/illustrations/running-commands.webp){ .illustration }

## Problem

**Badge:** `screen`

The tool: `bash` runs a shell command and waits for it to finish. A web app's `python app.py` or `uvicorn app:app` never finishes; it serves until stopped. A small model that wants to check its work starts it in the foreground, and the session waits forever.

## Eval case

**Badge:** `conjecture`

**Before:** bare Pi with what the earlier Easy lessons added
(`guard/break-repeat-loops, guard/stay-in-workspace, guard/refuse-whole-file-rewrite`). **After:** the same plus `guard/block-foreground-server`. The
lesson's own challenge, a task built to provoke this failure, is not built
yet, so for now both run on Bronze.

## Evidence of the problem

**Badge:** `screen`

The most common failure on the vLLM host: in nine bare sessions on 2026-10-29, four stalled on `python app.py` or `uvicorn … --reload`, and three of those failed. The harness's 120-second stall cutoff is what ended them; without it each would have burned its whole deadline.

## Solution

**Badge:** `screen`

**Remedy unit:** `guard/block-foreground-server`; apply it with `--remedy guard/block-foreground-server`.

**Lesson check:** run twice on 2026-10-29, and it did not show FAIL → PASS:
on a short task this model rarely starts a server in the foreground, so
the arm without the guard passed too (see Validation).

The guard reads every `bash` command. A server start (`python app.py`, `uvicorn`, `flask run`, `npm run dev`, …) that is not backgrounded is refused, with the background form to use instead and the advice to exercise endpoints in process, the way the tests do. Read-only commands that only mention a server (`grep uvicorn app.py`) pass.

```ts
if (!isForegroundServer(command)) return undefined;
return { block: true, reason: "That starts a server in the foreground; it blocks forever … `" + backgroundForm(command) + "`" };
```

## Validation

**Badge:** `conjecture`

**Lesson check, 2026-10-29** (its own challenge, two revisions, vLLM host,
n = 3 per arm;
[record](https://github.com/andrevanzuydam/mellum-worker/blob/main/docs/superpowers/research/2026-10-29-e5-check.md)):
in both, before passed 3 of 3 and after 3 of 3. Revision 2 made every
session start a server (a live `curl` saved to `health.txt`); without the
guard the model backgrounded it itself or got its answer before moving on,
and none hung. With the guard, six foreground starts were refused across two
sessions and both went on to pass. The guard works when the failure happens;
on a short task this model rarely makes it, and the recorded stalls came from
long sessions.

This page says FAIL → PASS only once a challenge has shown it.

## Interpretation

The weakest badge is `screen`: the stall is measured (four of nine bare sessions), the fix is not yet measured on its own. Of the Easy lessons this is the one most likely to show a clean FAIL → PASS on this host, which is why its challenge is built first.

### Run it yourself

Before, then after:

```bash
uv run python learn/code/harness.py run --suite easy --remedy guard/break-repeat-loops,guard/stay-in-workspace,guard/refuse-whole-file-rewrite --repeat 3 --grade
uv run python learn/code/harness.py run --suite easy --remedy guard/break-repeat-loops,guard/stay-in-workspace,guard/refuse-whole-file-rewrite,guard/block-foreground-server --repeat 3 --grade
```

!!! success "Key points"

    - `bash` waits for a command to finish, and a server never does.
    - On the vLLM host, a foreground server stalled four of nine bare sessions.
    - `guard/block-foreground-server` refuses the start and shows the background form.
