# Check: rung 9 with the one-file roadmap alone

An exploratory check (no preregistration), read with
[the note](../../superpowers/research/2026-10-13-rung9-screen.md). Mellum Mode, guards
and facts on, rung 9 (AgentClinic phase 4), three repeats, Pi 1.1.0, oMLX 0.7.0, worker
`v0.1.8-1-gb31372b`, 2026-10-13.

Launch, from `ladder/`:

    uv run python -m ladder.run_ladder --mode mode --profile baseline --rung 9 --repeat 3 --deadline 600 --mode-facts on --roadmap one-file --out ../docs/ladder/screen-rung9-one-file-roadmap

| repeat | result | requests | wall s (untrusted) | hidden tests | outside layout |
| --- | --- | --- | --- | --- | --- |
| 1 | FAIL | 27 | 164 | no | 0 |
| 2 | pass | 26 | 164 | yes | 0 |
| 3 | FAIL | 21 | 124 | no | 0 |
