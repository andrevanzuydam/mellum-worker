# Phase 5 (OpenCode): Mellum Worker agent

Check: `~/.config/opencode/agents/mellum-worker.md` exists and its body is
the prompt in `$PKG/prompts/mellum-worker.md`.

If missing or stale:

```bash
mkdir -p ~/.config/opencode/agents
node "$PKG/scripts/render-agent.mjs" opencode > ~/.config/opencode/agents/mellum-worker.md
cat ~/.config/opencode/agents/mellum-worker.md
```

If the user's global `opencode.json` already has an `agent.mellum-worker`
block (an older hand-made one), show both and ask which to keep; the JSON
block overrides the markdown file. Recommend removing the JSON block.

Limits to state plainly: OpenCode has no Mellum Mode and no guards. There
is no hook that rewrites the outgoing request or nudges an empty final
turn, so the `steps: 40` cap is the only guard. OpenCode also injects the
user's global and project AGENTS.md into subagents; keep those files short
or expect them in Mellum's context. The OpenCode port is unmeasured; the
numbers in the README are from Pi.

Re-run the check (`opencode agent list` if available, else the file check).
