# Phase 3: Server

Check: `curl -s http://127.0.0.1:8001/v1/models` returns JSON whose `data`
array contains an entry with `"id": "Mellum2.1-12B-A2.5B-Thinking-6bit"`.

If the port does not answer, start oMLX. Either the menu-bar app (add
`~/.cache/huggingface/hub` as a model directory in its settings and set
port 8001, one concurrent request, hot cache off, memory guard 14), or the CLI:

```bash
omlx serve \
  --model-dir "$HOME/.cache/huggingface/hub" \
  --host 127.0.0.1 --port 8001 \
  --max-concurrent-requests 1 --hot-cache-max-size 0 --memory-guard-gb 14
```

`--model-dir` is the parent of the model folder; pointing it at the model
folder itself finds nothing. Run it in the background or another terminal.
Wait for the check to pass.

Per-model settings. These apply to every client of this model, so show
them and ask before changing. Read the current values:

```bash
curl -s http://127.0.0.1:8001/admin/api/models | python3 -c "import json,sys; [print(json.dumps(m['settings'],indent=1)) for m in json.load(sys.stdin)['models'] if m.get('id')=='Mellum2.1-12B-A2.5B-Thinking-6bit']"
```

Wanted. The context window, TurboQuant, thinking budget and tool-result cap
bind every client and no request changes them. Pi sends their
own `max_tokens` with every request, and Pi its thinking flag, and oMLX
gives the request precedence; the server's `max_tokens` covers a client that
sends none. Two server settings beat the request: `forced_ct_kwargs` and
`force_sampling`.

| key | value | why |
| --- | --- | --- |
| `max_context_window` | 56000 | 50k prompt plus generation fits the validated memory budget |
| `max_tokens` | 16384 | Pi sends 16,384 per request anyway; the measured Mode and Worker runs used it |
| `forced_ct_kwargs` | `["enable_thinking"]` | forces the server's `enable_thinking` over any request, so every client thinks; Pi sends it on anyway (thinking off failed the ladder) |
| `enable_thinking` | true | the value forced; false here would turn thinking off for every client |
| `thinking_budget_enabled` | false | the ladder never ran with a server thinking budget |
| `max_tool_result_tokens` | `null` (unset) | the ladder never cut tool results |
| `force_sampling` | if on, sampling 1 / 0.95 / 20 | when on, the server's temperature, top_p and top_k win over Pi's; leave it off, or keep them at Pi's values |
| TurboQuant / cache quantization | off | the hybrid cache must stay native |

Apply with the user's yes:

```bash
curl -s -X PUT http://127.0.0.1:8001/admin/api/models/Mellum2.1-12B-A2.5B-Thinking-6bit/settings \
  -H 'content-type: application/json' \
  -d '{"max_context_window":56000,"max_tokens":16384,"forced_ct_kwargs":["enable_thinking"],"enable_thinking":true,"thinking_budget_enabled":false,"max_tool_result_tokens":null}'
```

Then read the values back and confirm they took. If the admin API needs
an API key on their server, tell the user to set the same six values plus TurboQuant off in
the admin page at `http://127.0.0.1:8001/admin` instead.
