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

Wanted (measured in the Pi ladder):

| key | value | why |
| --- | --- | --- |
| `max_context_window` | 56000 | 50k prompt plus generation fits the validated memory budget |
| `max_tokens` | 4096 | every published number used 4,096; 16,384 is untested on the current recipe (backlog) |
| `forced_ct_kwargs` | `null` (unset) | the ladder never forced it; the server's thinking default is on |
| TurboQuant / cache quantization | off | the hybrid cache must stay native |

Apply with the user's yes:

```bash
curl -s -X PUT http://127.0.0.1:8001/admin/api/models/Mellum2.1-12B-A2.5B-Thinking-6bit/settings \
  -H 'content-type: application/json' \
  -d '{"max_context_window":56000,"max_tokens":4096,"forced_ct_kwargs":null}'
```

Then read the values back and confirm they took. If the admin API needs
an API key on their server, tell the user to set the same three values plus TurboQuant off in
the admin page at `http://127.0.0.1:8001/admin` instead.
