# Phase 1: Preflight

Checks, in order. Stop at the first failure and tell the user what v1 needs.

1. `uname -m` prints `arm64` and `uname -s` prints `Darwin`. Anything else:
   v1 supports Apple Silicon with oMLX only. Point the user at
   `docs/backends/ollama.md` for what a port needs, and stop.
2. oMLX is installed: either the menu-bar app is present
   (`ls /Applications | grep -i omlx`) or `command -v omlx` succeeds. If
   neither, tell the user to install oMLX 0.6.4 or newer from its
   release page and come back.
3. `hf --version` succeeds (Hugging Face CLI 1.0 or newer). If not:
   `uv tool install huggingface_hub` or `pip install -U huggingface_hub`.
4. `node --version` is 24 or newer; the setup scripts need it.
5. Free disk: `df -h ~ | tail -1`. The weights are 9.9 GB.

Record the host (Pi or OpenCode) from the SKILL.md rule. Done.
