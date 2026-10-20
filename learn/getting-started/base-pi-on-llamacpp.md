---
title: Base Pi on llama.cpp
track: getting-started
position: 1
prerequisites: []
authors: [Paul Everitt]
backends: [llamacpp]
---

# Base Pi on llama.cpp

By the end of this lesson, a machine that had no Python runs a local Mellum
and answers a prompt through base Pi — Pi with no worker, no extensions and
none of your own settings. It takes a few commands and one large download.

Everything runs from a clone of `mellum-worker`, because the settings, the
Pi profile and, in the next lesson, the harness are files in this repo.

## What you need

- A terminal. The commands below are tested on macOS on Apple Silicon; Linux
  and Windows use llama.cpp's own releases and the same commands.
- About 10 GB free: the `Q4_K_M` weights are 8.1 GB, and the server peaked at
  8.38 GB with a 50,000-token context.

## 1. Install uv

`uv` installs Python and runs the project's commands. It is the only tool
this track asks you to install by hand.

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv --version
```

On Windows, use `winget install --id=astral-sh.uv` or the PowerShell
installer from uv's site.

## 2. Let `pyproject.toml` choose Python

This repo's `pyproject.toml` says `requires-python = ">=3.14"`. That line is
the whole reason no Python is needed up front: `uv run` reads it, fetches
that interpreter if the machine has none, and runs the command in a project
environment.

```toml
[project]
requires-python = ">=3.14"

[tool.mellum]
model = "JetBrains/Mellum2.1-12B-A2.5B-Thinking-GGUF:Q4_K_M"
context = 50000
max_tokens = 16384
temperature = 1.0
top_p = 0.95
top_k = 20
```

`[tool.mellum]` is the one place model settings live. The server, `chat` and
the Pi profile are generated from it, so changing a value here changes every
one of them together.

## 3. Install llama.cpp

```bash
brew install llama.cpp
llama-server --version
```

Linux builds from source or uses a release binary; Windows uses a release
binary. Whichever way, `llama-server` must be on `PATH` — the next command
says so plainly if it is not.

## 4. Fetch the tools a later lesson grades with

`uvx` runs a Python tool without installing it into the project:

```bash
uvx ruff --version
uvx pyrefly --version
```

That first run downloads and caches each tool, so the grading in a later
lesson will not turn into a setup detour.

## 5. Start the server

```bash
uv run scripts/backend.py start
uv run scripts/backend.py status
```

The first `start` downloads `Q4_K_M` through llama.cpp's `-hf`, so it takes a
while; the command waits for health and prints the pid and log path. `status`
then reports `up on 127.0.0.1:8002` and `n_ctx 50000`.

The settings become llama.cpp's flags: `-c 50000` from `context`, and the
model name from `[tool.mellum]`. Everything else — the batch sizes, the
`q8_0` KV cache, Metal offload — is the 16 GB profile written into
`scripts/backend.py`, and `scripts/backend.py` is short enough to read.

## 6. Chat once

```bash
uv run scripts/backend.py chat "In one sentence, what makes a test useful?"
```

The reply goes to stdout; the model's thinking and the token count go to
stderr. `temperature`, `top_p` and `top_k` are the values from
`pyproject.toml`, not hidden defaults.

## 7. Connect Pi

The repo carries a private Pi profile at `learn/code/profile/`, generated
from `[tool.mellum]`. Point Pi at it and ask for one line:

```bash
PI_CODING_AGENT_DIR=$PWD/learn/code/profile pi -p \
  --provider llamacpp --model Mellum2.1-12B-A2.5B-Thinking \
  --no-approve --no-extensions --no-skills --no-prompt-templates \
  --no-themes --no-context-files --no-session \
  "Say hello in one line."
```

What those flags buy you: your own `~/.pi` is neither read nor written, the
repo's `AGENTS.md` does not load, and no extension or skill is discovered.
The run is base Pi on the model, which is what the next lesson measures.
`--no-approve` is there because the profile is the only configuration this
run should trust.

## 8. Stop it

```bash
uv run scripts/backend.py stop
```

## What you have

A local Mellum on llama.cpp, a one-command chat, and base Pi answering
through a profile that lives in the repo. Next, in phase LC.3: make a mini
harness that runs base Pi on tasks and scores it.
