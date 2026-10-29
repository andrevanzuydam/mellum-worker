# E5's lesson check, 2026-10-29

The preregistered check (`docs/superpowers/research/2026-10-29-e5-check-prereg.md`)
of E5 · Running Commands on its own challenge
(`learn/challenges/e5-running-commands/`), at `96c21f2`, on the pinned vLLM
host (RTX A6000, Mellum 2.1 BF16, vLLM 0.32.0, Pi 1.3.0; vast.ai instance
58241671): n = 3 per arm, `--deadline 600 --stall 120`, no `--grade`.
Reading: `docs/superpowers/research/2026-10-29-e5-check.md`.

| Arm | Remedy line | Passed | Foreground server tried | Guard blocks |
| --- | --- | --- | --- | --- |
| before | `guard/break-repeat-loops,guard/stay-in-workspace,guard/refuse-whole-file-rewrite` | 3/3 | 0 of 3 sessions | 0 |
| after | the same plus `guard/block-foreground-server` | 3/3 | 1 of 3 (blocked, then backgrounded) | 1 |

`before/` and `after/` keep each session's `run.json`. A first attempt at
`d91856e` (instance 58239027) is **void**: relative `--runs-dir` and
`--profile` paths made every session end at start with 0 requests, fixed in
`96c21f2`; its sessions are not recorded. Traces are not in git.
