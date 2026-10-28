# Preregistration: one prose brief against steps, medium, a screen

Date: 2026-10-25, written before the run. LC.17, lesson 8, "A prose brief stops
at its first reply".

**What is measured.** Whether the same four phase briefs, sent as **one
request** instead of four, still pass — and what the two shapes cost. Screen
only: **n = 1 per arm**, one session each, no rate. The lesson template allows
a screen at n = 1 so long as it carries a `screen` badge and is not worded as a
rate, and this page will do both.

- Backend: `llama-server` 0.7.0 (build 11669), Mellum 2.1 `Q4_K_M`,
  `-c 50000` (`n_ctx` 50,176), `127.0.0.1:8002`, `scripts/backend.py start`.
- Machine: **Apple M1 Pro, 8 cores, 32 GiB.** The backend records and the
  45-session record were taken on an **M5 Max, 128 GB**; peak token counts
  travel between machines and walls do not, so no wall here is compared with an
  M5 Max wall.
- Sampling: the learner's profile — `temperature 1`, `top_p 0.95`, `top_k 20`,
  `max_tokens 16384`.
- Runner: `uv run python learn/code/harness.py run --suite medium --arm worker
  --deadline 1800 [--single-prompt]`.
- Deadline: **1800 s**, fixed here from a timing probe rather than guessed. The
  probe reached prompt 3 of 4 at 1044 s before the environment killed it, which
  puts a full medium session near 1400–1600 s on this machine. Every record now
  carries `machine` and `deadline` so the calibration is visible in the data.

**Arms, one change between them.**

| Arm | How the brief is sent |
| --- | --- |
| steps | medium's four `prompts/*.md`, one request each (unchanged harness behaviour) |
| one brief | `--single-prompt`: the same four files joined with blank lines, one request |

The flag concatenates the suite's own prompts, so the base, the grader and the
brief text are identical across arms. A copied suite would have two graders that
can disagree, and then the comparison is not one change.

**Reading.** Per arm: passed, failed checks, requests, tool errors, peak input
tokens, wall, and the limit `max_tokens` reached. The last is the lesson's own
mechanism: a long brief read once invites the model to answer the first phase
and stop. If the one-brief session's final text claims completion while phases
2–4 failed, that is the lesson's pathology observed, and the page may quote it.

**Decision rules, fixed now.**

1. Both arms pass: **null on this suite**, at n = 1. The page states the
   difference in cost and retires "loses four passes".
2. The one-brief arm fails phases the steps arm passed: the page reports the
   screen with the failing phase named, and says the claim survives at n = 1 on
   medium, machine named.
3. Either arm hits the 1800 s deadline: reported as **DEADLINE**, not as a
   failure, and the arm is recorded as unmeasurable at this size.
4. A run whose `machine` or `deadline` in `run.json` disagrees with this
   document is invalid.

**What is conjecture.** That one session per arm says anything about the
policy; it does not, and the page may not generalise. The mechanism — the model
finishing the first phase and calling the job done — is what the reading is
looking for, and a single session can show it or fail to.

**What would falsify this.** A steps arm that fails where the one-brief arm
passes would reverse the direction. A one-brief failure that names a phase the
steps arm also failed would make the comparison uninformative.

**Risks.** n = 1 is a demonstration, not a measurement. The M1 Pro is roughly
1.7–3× slower than the machine the other records used, so wall comparisons must
stay inside this document. One suite, one task, one machine.

**Raw evidence.** Run directories go to a `research-2026-10-25` release after
review, never into git.
