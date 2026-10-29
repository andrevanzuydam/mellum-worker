# The Running Commands lesson check, 2026-10-29

The lesson (now E6 · Running Commands; E5 when this was preregistered) on its
own challenge, `learn/challenges/running-commands/`, on the pinned vLLM host
(RTX A6000, Mellum 2.1 BF16, vLLM 0.32.0, Pi 1.3.0): n = 3 per arm,
`--deadline 600 --stall 120`, no `--grade`. Before is the Easy guards up to
this lesson; after adds `guard/block-foreground-server`. Reading:
`docs/superpowers/research/2026-10-29-e5-check.md`.

| Revision | Challenge | Before passed | After passed | Guard blocks (after) |
| --- | --- | --- | --- | --- |
| 1 (`96c21f2`, instance 58241671) | build, "make sure it starts", then extend | 3/3 | 3/3 | 1 |
| 2 (`69ee894`, instance 58244985) | build, start it and save a live `curl` to `health.txt`, then extend | 3/3 | 3/3 | 6 (in 2 sessions) |
| 2 on the 6-bit, a screen (`ce91125`, LAN vLLM, profile `lan`) | the same | 2/3 | 3/3 | 8 (in 2 sessions) |

Revision 2 was preregistered at `2920389`; the commits up to `69ee894` only
renamed pages. In both revisions no before session started a server in the
foreground: the model checked in process (revision 1) or backgrounded the
server itself (revision 2). A void first attempt at revision 1 (`d91856e`,
instance 58239027; relative paths, 0 requests) is not recorded.

Each session's `run.json` is kept under `revision-<n>/<arm>/`; traces are not
in git.

The 6-bit screen (`revision-2-lan-6bit/`) ran on Mellum at 6 bits served by
vLLM on a LAN host, through the pinned Pi 1.3.0. Its before arm had one
foreground stall (`uvicorn app:app --port 8000`, session `9044f2`); its after
arm ran after a by-hand kill of that session's leftover server, the leak fixed
in `57011a9`. Guard blocks are counted in each session's final context.
