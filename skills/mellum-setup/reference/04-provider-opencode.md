# Phase 4 (OpenCode): Provider

Check: `opencode models omlx 2>/dev/null | grep -q 'omlx/Mellum2.1-12B-A2.5B-Thinking-6bit'`.

If missing, the provider block lives in the global config,
`~/.config/opencode/opencode.json` or `opencode.jsonc`. That file may hold
comments, so do not run it through the merge script. Read
`$PKG/templates/opencode/provider.omlx.json` and insert it with the edit tool:

- No `provider` key yet: add the whole `"provider": { "omlx": {...} }` object.
- A `provider` key but no `omlx`: add the `"omlx": {...}` entry inside it.
- An `omlx` provider already: add only the
  `"Mellum2.1-12B-A2.5B-Thinking-6bit": {...}` entry inside its `models`.
  Do not touch the user's other models or their `options`.

Show the user the exact insertion before making it. The `limit` block
(context 56,000, output 16,384) matches the server from phase 3; a
smaller output limit cuts long tasks off.

Re-run the check.
