# Phase 4 (Pi): Provider

Check: `pi --list-models 2>/dev/null | grep -q 'omlx/Mellum2.1-12B-A2.5B-Thinking-6bit'`
(if that flag is absent in the user's Pi, inspect `~/.pi/agent/models.json`
for an `omlx` provider with a model id `Mellum2.1-12B-A2.5B-Thinking-6bit`).

If missing, preview the merge:

```bash
node "$PKG/scripts/merge-json.mjs" ~/.pi/agent/models.json "$PKG/templates/pi/models.omlx.json"
```

Show the preview. Existing providers and other `omlx` models are kept; a
backup is written next to the file. With the user's yes:

```bash
node "$PKG/scripts/merge-json.mjs" ~/.pi/agent/models.json "$PKG/templates/pi/models.omlx.json" --write
```

If `~/.pi/agent/settings.json` has an `enabledModels` list, the model is
hidden until it is listed. Offer to add `"omlx/Mellum2.1-12B-A2.5B-Thinking-6bit"`
to that list; edit the file with the edit tool, do not rewrite it.

Why these fields: `supportsDeveloperRole: false` keeps Pi from sending the
system prompt as a `developer` message, which this server does not expect;
`thinkingFormat: qwen-chat-template` matches how the model emits thinking;
`maxTokens 16384` and `contextWindow 56000` match the server. Sampling is
the model card's agentic setting, 1 / 0.95 / 20.

Re-run the check. Restart Pi if it was open; it reads models.json at start.
