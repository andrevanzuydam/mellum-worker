# Preregistration: a llama.cpp reference run, rungs 1–5

Date: 2026-10-20, written before the run. A reference run for the Learning
Center. It decides nothing and promotes nothing; it exists so a lesson can
cite a `reference-run` made on the backend the learner uses.

**What is measured.** The shipped worker, direct mode, against llama.cpp on
this machine. Not a comparison with oMLX: those numbers are a different
backend and are not carried across.

- Backend: `llama-server` 0.7.0 (build 11669), Mellum 2.1 `Q4_K_M`,
  `-c 50000`, `127.0.0.1:8002`, started by `uv run scripts/backend.py start`.
- Request parameters: the ladder's greedy block (`temperature 0`, `top_p 1`,
  `top_k 0`, `min_p 0`, `seed 42`, `max_tokens 4096`), profile `baseline`.
  The lesson's sampling (`1 / 0.95 / 20`) is not used; the ladder measures
  settings, not sampling variance.
- Runner: `--mode direct --profile baseline --thinking high
  --prompt-mode replace --rung 1 --rung 2 --rung 3 --rung 4 --rung 5
  --repeat 3 --deadline 600 --provider llamacpp
  --base-url http://127.0.0.1:8002/v1
  --model llamacpp/Mellum2.1-12B-A2.5B-Thinking --context-window 50000`.
- Worker: the checkout's `package.json` version and `git describe --dirty`,
  recorded by the runner.
- n = 15: three repeats on each of rungs 1–5.

**Reading.** For each rung, the passes out of three; then the total out of
15, the median requests and the tool errors. A run is **valid** only if its
first `provider_request` carries the greedy block and `max_tokens` 4096; an
invalid run is excluded and named. Deadline hits and leftover processes are
listed, not hidden. Failures are reported as they occurred.

**Decision rule.** If all 15 runs are valid, the record is citable as the
`reference-run` for the Getting started lessons, and it states the counts
as observed. It changes no worker setting, promotes nothing, and makes no
comparative claim. A rung that fails is reported; any rerun after seeing
these results is a new preregistration with its own date.

**What is conjecture.** That rungs 1–5 tell a learner much: they are small,
so a 15/15 would say only that the port works, not that the model is good.
The record is evidence of the backend path, not of capability.

**What would falsify this.** A run whose first request differs from the
greedy block, a run under a dirty or different worker, or a recorded
`omlx` version — any of these means the run measured something else, and
the record must say so and not be cited.

**Risks.** llama.cpp and oMLX may disagree on the chat template and
thinking extraction; a pass count from here does not transfer to oMLX, and
the record says so. The machine is one M5 Max; nothing here is a 16 GB
claim.

**Raw evidence.** `trace.jsonl`, `stdout.txt` and `diff.patch` per run go
to a `research-2026-10-20` release after review, never into git; the
record's README carries the tarball's SHA-256.
