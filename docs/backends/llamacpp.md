# Backend: llama.cpp on Apple Silicon

**Smoke-tested, not ladder-measured.** A single request round-tripped
through `/v1/chat/completions` with tools, thinking on, at 50k context.
No rung has been rerun, so no number here belongs in the README's status
table. Measured on an M5 Max, 128 GB; a 16 GB machine was not run.

## Install

```bash
brew install llama.cpp     # 0.7.0, build 11669 when this was written
llama-server --version
```

Metal is the default on Apple Silicon. `--jinja` is on by default in this
build, and the GGUF's own chat template is used — the model ships a ChatML
`<|im_start|>` template, which llama.cpp picks up without help.

## Weights

`JetBrains/Mellum2.1-12B-A2.5B-Thinking-GGUF` publishes BF16 and four
quants. `just pull Q4_K_M` fetches into the Hugging Face cache.

| File | Size |
| --- | --- |
| `MXFP4_MOE` | 7.0 GB |
| `Q4_K_M` | 8.1 GB |
| `Q6_K` | 10.9 GB |
| `Q8_0` | 12.9 GB |
| `BF16` | 24.3 GB |

## Serve

`just` in the repo root wraps this; the recipes are the whole config.
No daemon, no launch agent — the model is resident only while a server
runs.

```bash
just serve            # foreground, BF16, 56k ctx, this machine
just start            # same, background + pidfile + health wait
just start-16g        # Q4_K_M, 50k ctx, -b/-ub 512, q8_0 KV
just chat "prompt"    # one-shot; thinking prints to stderr
just status / stop / models / logs
```

The command `start-16g` runs:

```bash
llama-server -m ~/.cache/huggingface/hub/Mellum2.1-12B-A2.5B-Thinking-Q4_K_M.gguf \
  --host 127.0.0.1 --port 8002 -c 50000 -np 1 -ngl 99 --jinja -fa auto \
  -b 512 -ub 512 -ctk q8_0 -ctv q8_0
```

## Settings, against the oMLX recipe

| oMLX (measured) | llama.cpp | Note |
| --- | --- | --- |
| `max_context_window` 56000 | `-c 56000` | server default; clients may send less |
| `max_tokens` 16384 | client `max_tokens` | a thinking model needs the cap |
| `force_sampling` 1 / 0.95 / 20 | `temperature`/`top_p`/`top_k` per request | in `just chat` |
| `forced_ct_kwargs` thinking on | `--reasoning on` | server-side, closest equivalent; not yet exercised on the ladder |
| `--max-concurrent-requests 1` | `-np 1` | |
| TurboQuant off | `-ctk/-ctv f16` | the hybrid cache stays native; `q8_0` only for the 16 GB preset |
| memory guard | none | `-b`/`-ub` and the quant are the only levers |

## Measured so far

| Run | Peak RSS | Generation | Prompt eval |
| --- | --- | --- | --- |
| Q4_K_M, 50k ctx, `-b/-ub 512` | 8.38 GB | 207.6 tok/s | 72.2 tok/s |
| BF16, 8k ctx, default batch | not recorded | 101.5 tok/s | 66.0 tok/s |

Tool calls parse: a `read` request came back as
`finish_reason: "tool_calls"` with `{"path": "/etc/hosts"}`.

## Why 50k context is cheap here

28 layers, but only 7 are full-attention; the other 21 are sliding-window
at 1024. KV at 50 000 tokens is `7 x 50000 x 1024 B + 21 x 1024 x 1024 B`
= 0.38 GB at f16, 0.20 GB at `q8_0`. Weights, not context, set the memory
budget: Q4_K_M peaks at 8.38 GB, which is what makes a 16 GB machine
plausible for the first time.

## Open

- No ladder rerun against port 8002, so nothing is comparable to the oMLX
  numbers yet.
- A 16 GB machine is untested; 8.38 GB leaves room for macOS but the
  wired limit and the GPU allocator were not observed there.
- Thinking is forced with `--reasoning on`, not with the oMLX
  `forced_ct_kwargs` mechanism; whether clients can override it has not
  been checked.
