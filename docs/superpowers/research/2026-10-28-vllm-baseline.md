# A replicable vLLM baseline for Mellum 2.1

**What is measured.** No baseline session has run. Checked on 2026-10-28:
vLLM v0.32.0 lists `MellumForCausalLM` (served through its Transformers MoE
backend since vLLM PR 59679); vLLM's recipe and JetBrains' model card serve it
with `--reasoning-parser qwen3` and `--tool-call-parser hermes`; the 2.1 chat
template honours `enable_thinking: false`; the pinned image is built on CUDA
13.0 (driver 580+). `baseline.py client` installed the pinned Node (checksum
verified) and Pi 1.3.0 on macOS arm64, and `baseline.py offers` returned three
verified on-demand RTX A6000 offers at $0.40–0.48/h with drivers 580 and 595.
Nothing has been rented.

**What is conjecture.** That the pinned stack serves Pi's tool calls and
thinking correctly; how fast a session runs over the tunnel; that results are
stable enough across hosts and client machines of the pinned kind to call a
run elsewhere a replicate.

## Why a new baseline

Every ladder number so far was measured on Apple Silicon (oMLX, MLX 6-bit;
some llama.cpp `Q4_K_M`). Nobody without that Mac and that server build can
rerun them. The new baseline is for anyone to rebuild from one command, on
macOS, Linux or Windows (WSL2 for the run step).

It measures **Pi and the model, nothing else**: vanilla Pi with no plugins,
extensions, skills, prompt templates or context files, on every ladder rung
(`run_ladder --mode primary --plain`) and every eval suite (the `bare` arm).
The recorder is loaded as the measuring instrument; its handlers return
nothing, so Pi's requests are unchanged. Every later change, the worker
included, is measured against this.

It runs **the model at full precision (BF16) through vLLM**, not the
shipped 6-bit product. vLLM has no 6-bit format, and its parsers return
structured tool calls and reasoning where oMLX and llama.cpp pass raw text.
So it starts a new table: a gap against the Apple-Silicon records is a
server-and-precision finding, not a regression.

## Where things run

vLLM runs on a rented GPU; Pi, the ladder and the suites run on the
operator's machine, through an SSH tunnel to the box. The GPU is the only thing
worth renting, and the budget is about $0.50/h. The cost is that network
latency and the client's CPU enter wall time; the manifest records the client
so a reader can see it.

## The pins

All of them live in [`scripts/baseline/pins.env`](../../../scripts/baseline/pins.env);
[`baseline.py`](../../../scripts/baseline/baseline.py) and the box scripts read
nothing else. The [recipe](../../../scripts/baseline/README.md) is how to run it.

| What | Pin |
| --- | --- |
| GPU | 1× NVIDIA RTX A6000, 48 GB (49140 MiB), driver ≥ 580; checked on the box and again before the run |
| Server | vLLM 0.32.0, image by digest |
| Model | `JetBrains/Mellum2.1-12B-A2.5B-Thinking` @ `92ddae9f`, BF16 |
| Serving | max-model-len 131072, gpu-memory-utilization 0.90, seed 0, qwen3 reasoning, hermes tools |
| Client | Node 22.19.0 (SHA-256 per platform), Pi 1.3.0 (the newest the ladder has recorded runs on), vastai 1.9.1, the ladder's and root `uv.lock` |
| Pi profile | vLLM provider, temperature 1.0, top-p 0.95, top-k 20, 16,384 output tokens (the model card's defaults and the suites' existing profile) |
| Run | ladder rungs 1–12 and suites easy/medium/hard, n = 3 each; deadlines 600 s (ladder) and 2,700 s (suites) |

Why the RTX A6000: BF16 weights are 24.3 GB (vLLM's recipe says 29 GB
minimum), which rules out 24 GB cards. Of the cards with room near
$0.50/h, the A6000 is a standard workstation part with native BF16 and several
verified offers. V100s are cheaper but have no BF16, which would change the
numerics. The 48 GB "4090" is a modified card nobody can count on renting. An
H100 SXM was the first pick, but the only one with a new enough driver cost
$4.19/h.

## Screen 1 (not yet run)

Presence questions, so n = 1 each, on one rung and the easy suite:

1. `up` rents the pinned GPU, `serve` passes the box check and starts vLLM
   (including whether 131,072 tokens of context fit beside the weights in 48 GB).
2. A plain ladder session and a bare suite session complete over the tunnel:
   Pi's tool calls arrive as tool calls and thinking arrives as reasoning.
3. `manifest.json` and `run.json` carry the server, GPU and client blocks.
4. Wall per session, to size the full run and its cost.

Sessions run one at a time; concurrency would change wall and is not a pin
yet. After the screen, preregister the baseline's reading — what is reported
per rung and per suite, and what a later arm must beat — before the full run.
At about $0.45/h the screen costs well under $5.

## What would falsify this

- Two runs that both pass every pin check differ systematically (then the GPU
  and client pins are not enough; the host driver, region or client OS belongs
  in the pins).
- Pi's tool calls or reasoning fail to parse under the pinned flags.
- `enable_thinking: false` does not reach the template through vLLM.

## Risks

- Sampling is at temperature 1.0 and vLLM batching is not bit-deterministic,
  so a replicate reproduces a distribution, not a transcript; n has to carry
  that.
- The A6000 offers are few (three on the day), so a replicator may wait for
  one. The pin is the card, not the provider: any host with it and the image
  will do.
- Tunnel latency and the client machine change wall time, not scores; a run
  that hits a deadline is the exception, and the manifest shows where it ran.
- Pins age: the image or revision may be pulled upstream. The digest and
  revision still identify exactly what was run.
