# Phase 4 (Pi): Provider

Check: `pi --list-models Mellum2.1 2>/dev/null | grep -Eq '^omlx +Mellum2\.1-12B-A2\.5B-Thinking-6bit'`
Pi prints provider and model as two columns, no slash. (If that flag is absent
in the user's Pi, inspect `~/.pi/agent/models.json` for an `omlx` provider with
a model id `Mellum2.1-12B-A2.5B-Thinking-6bit`.)

If missing: if `~/.pi/agent/models.json` already has a `providers.omlx` entry
(check with `node -e` or by reading the file), merge
`$PKG/templates/pi/models.omlx.models-only.json` so your base URL, API key, and
other models are untouched; otherwise merge `$PKG/templates/pi/models.omlx.json`.
Preview first (shown with the full fragment; swap in the models-only file when
`providers.omlx` exists):

```bash
node "$PKG/scripts/merge-json.mjs" ~/.pi/agent/models.json "$PKG/templates/pi/models.omlx.json"
```

Show the preview (it prints only `providers.omlx` after the merge). Existing
providers and other `omlx` models are kept; a backup is written next to the
file. With the user's yes:

```bash
node "$PKG/scripts/merge-json.mjs" ~/.pi/agent/models.json "$PKG/templates/pi/models.omlx.json" --write
```

If `~/.pi/agent/settings.json` has an `enabledModels` list, the model is
hidden until it is listed. Offer to add `"omlx/Mellum2.1-12B-A2.5B-Thinking-6bit"`
to that list; edit the file with the edit tool, do not rewrite it.

Why these fields: `supportsDeveloperRole: false` keeps Pi from sending the
system prompt as a `developer` message, which this server does not expect;
`thinkingFormat: qwen-chat-template` matches how the model emits thinking;
`maxTokens 16384` is the output limit Pi sends with each request (oMLX
honours it over the server's 4,096), and `contextWindow 56000` matches the
server. Sampling is the model card's agentic setting, 1 / 0.95 / 20.

Re-run the check. Restart Pi if it was open; it reads models.json at start.
