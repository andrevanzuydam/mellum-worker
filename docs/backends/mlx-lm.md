# Backend: a plain mlx_lm.server (the `--backend mlx-lm` ladder path)

An alternative to oMLX for running and measuring Mellum on Apple Silicon: a
plain, fully scriptable `mlx_lm.server`, driven by the ladder's
`--backend mlx-lm` path (no oMLX admin API, so the server's launch flags, not
the ladder, set the server-only values). This file records how to run it and
the issues hit the first time, so the next person does not rediscover them.

Verified once, as a smoke (not the measured suite): rung 1, direct mode,
`--profile tuned`, scored **pass** through Pi 1.3.0 → `mlx_lm.server` → Mellum,
7 requests, ~22 s. n = 1; a measured claim still needs a preregistered run.

## What you need (oMLX is NOT one of them)

- **The weights** (`docs/backends/omlx.md` §Weights) in a local folder.
- **`mlx_lm`** (`pip install mlx-lm` into a venv) to serve them.
- **The Pi CLI** — the ladder launches every run through `pi`. Install with
  `npm install -g @earendil-works/pi-coding-agent` (Node >= 22.19) or
  `curl -fsSL https://pi.dev/install.sh | sh`; verify `pi --version`.
- You do **not** need the oMLX app. That is the whole point of this path: the
  request-level values (sampling, max_tokens) are sent by the ladder through a
  generated Pi `models.json`, so a plain OpenAI-completions server is enough.

## Serve

```bash
cd <weights-parent>            # e.g. the folder that holds the model dir
HF_HUB_OFFLINE=1 python -m mlx_lm.server \
  --model <model-dir-name> --host 127.0.0.1 --port 11500
```

Then run the ladder against it:

```bash
cd ladder && uv run --offline python -m ladder.run_ladder \
  --mode direct --backend mlx-lm --base-url http://127.0.0.1:11500/v1 \
  --profile tuned --rung 1 --repeat 1 --out ../docs/ladder/<name>
```

## Issues hit, and the fix

1. **Model-id mismatch -> a HuggingFace 404 (the big one).**
   `mlx_lm.server` canonicalises its served model id to the **absolute path**
   of the weights (see `GET /v1/models`). The ladder's direct mode sends the
   short id `Mellum2.1-12B-A2.5B-Thinking-6bit`. When the request's `model`
   does not match a loaded model, `mlx_lm.server` treats it as a **HF repo_id
   and tries to fetch it**, failing with
   `Repository Not Found for url: https://huggingface.co/api/models/Mellum2.1-...`
   (a 404/401), and the run scores `error` with 0 requests.
   **Fix:** launch the server from **inside the weights' parent dir** with the
   **bare dir name** (`--model Mellum2.1-12B-A2.5B-Thinking-6bit`), so the short
   id the ladder sends resolves to the same local path. See the known gap below
   for the proper fix.

2. **Set `HF_HUB_OFFLINE=1` on the server.** It stops a model-id miss from
   turning into a slow (or hanging, on an air-gapped box) HuggingFace network
   call, and forces local resolution. Keep `HF_HOME` project-local too.

3. **Lazy load.** `mlx_lm.server` answers `/v1/models` before the weights are
   in memory; the first chat request pays the load. Warm it with a 1-token
   request if you are timing throughput.

4. **One model at a time.** The 6-bit weights are ~9.9 GB and serving peaks
   ~10-12 GB. On a 48 GB machine, other resident MLX servers were evicted when
   Mellum loaded. Serve only the model you are measuring.

5. **Thinking model + `/v1/completions` quirk.** Against the raw completions
   endpoint, `mlx_lm.server` parses a `<tool_call>` out of the `text` field and
   returns `finish_reason: tool_calls` with empty text. Use
   `/v1/chat/completions` (the ladder and Pi do) to get parsed `tool_calls`.

## Known gap (follow-up)

The ladder hardcodes the model id it sends (`MODEL_ID` in
`ladder/ladder/pi_profile.py`). A real `mlx_lm.server` serves under whatever id
it canonicalised (usually a path), so today it only works via the cwd + bare-name
trick in issue 1. The proper fix is a `--model-id` override on the `mlx-lm`
backend, so the id Pi sends can be set to match any served id without the trick.
Until then, follow the serve recipe above exactly.

## Settings parity (honest limits)

A plain `mlx_lm.server` has no admin API, so the oMLX server-only values
(`max_context_window`, `thinking_budget`, `max_tool_result_tokens`,
`forced_ct_kwargs`) are set, if at all, by `mlx_lm.server` launch flags and do
not all have equivalents. An oMLX-vs-mlx-lm result is therefore a harness
finding about servers, not a claim about the shipped worker; see the BACKLOG
entry "Benchmark a plain mlx_lm.server against oMLX".
