# M.7: project facts let Mellum pass the looser AgentClinic specs

Date: 2026-10-10 (the phase's spec is dated 2026-10-09). Spec:
[`2026-10-09-m7-project-facts-design.md`](../specs/2026-10-09-m7-project-facts-design.md).
Phase records: [A18](../../ladder/ablation-a18-agentclinic-facts-off/README.md),
[A19](../../ladder/ablation-a19-facts-on/README.md),
[A20](../../ladder/ablation-a20-facts-fallback-only/README.md).

**What is measured.** Three ladder phases of Mellum Mode on the four
AgentClinic rungs (6–9: build the project from the looser phase specs, one
phase per rung, three repeats each): A18 with project facts off (Mode as
shipped), A19 with the fixture's `## Mellum` section forwarded (plus rungs
1–5, where the Python rungs get the detected fallback command), and A20 with
the section stripped so only the fallback `uv run --offline python -m pytest
-q` is forwarded. All rungs 6–9 results are scored under spec §2 rule 3 as
changed by Paul ("no existing test is removed or edited; additions are
allowed"); A18 through its rescored workspaces, A19 and A20 directly. Every
number below is computed from the phases' `run.json` files (`check.passed`,
or `check_rescored.passed` for A18; `score.requests`, the `requests` column
of each `table.md`).

**What is conjecture.** Which part of the section does the work. A19 removed
the import error and the write-list entries together; A20 shows the
fallback command alone recovers most of the gain, but its five failures are
mostly runs that ignored the fallback, so the write-only and do-not
bullets' own share is not isolated. Why the model sometimes prefers the
prompt's `uv run --offline pytest -q` over a forwarded command that differs
by `python -m` was not examined.

## Verdict: SHIP

The ship rule (spec §3), applied as written:

| condition | needed | measured | holds |
| --- | --- | --- | --- |
| A19 rungs 1–5 | ≥ 13/15 | **15/15** | yes |
| A19 rungs 6–9 | ≥ A18 + 3 (1 + 3 = 4) or ≥ 10/12 | **9/12** | yes (first branch) |
| A19 median requests, rungs 6–9 | below A18's (50) | **26** | yes |

All three hold, so the facts code (commit `aff031a`) ships. The second
condition holds through "A18 + 3", not through "≥ 10/12".

## Probe evidence (before the fixture)

Phase 1 of ac-demo through headless Mode on scratch clones, 2026-10-09; one
or two runs per brief level, an indication rather than a ladder phase:

| Brief | Passes the spec's test | Requests | Wall |
| --- | --- | --- | --- |
| full task line (files, test command) | 1/1 | 27 | 54 s |
| `Implement specs/phase-1-home.md` | 2/2 (one wrote a forbidden `pytest.ini`) | 28, 37 | 75, 115 s |
| a developer sentence | 1/2 (one false success) | 47, 53 | 147, 195 s |

The four looser runs' run records are in
[`2026-10-09-m7-project-facts/runs.jsonl`](2026-10-09-m7-project-facts/runs.jsonl)
(schema 2, one line per run: labels L1-a, L1-b for the spec-file sentence,
L2-a, L2-b for the developer sentence). Three of the four list `uv run
--offline pytest -q` as their first command; L2-a's first is `ls -R`. The
full-task-line run's record is not in that file; its row is quoted from the
spec.

## Rungs 6–9, per rung

| rung | A18 strict | A18 rescored | A19 | A20 |
| --- | --- | --- | --- | --- |
| 6 (phase 1, home) | 0/3 | 0/3 | 3/3 | 1/3 |
| 7 (phase 2, board) | 0/3 | 1/3 | 3/3 | 2/3 |
| 8 (phase 3, add) | 0/3 | 0/3 | 2/3 | 3/3 |
| 9 (phase 4, resolve and reopen) | 0/3 | 0/3 | 1/3 | 1/3 |
| all | 0/12 | **1/12** | **9/12** | **7/12** |
| requests, median (mean) | 50 (54) | | 26 (32) | 28 (37) |
| wall s, mean (untrusted) | 316 | | 163 | 195 |
| deadline hits | 3 | | 1 | 1 |

Under A18's strict byte-identical rule, A19 would score 6/12 and A20 4/12
(the runs that appended tests to a starting file, read from `diff.patch`,
not scored); the ship rule would still hold (6 ≥ 0 + 3).

## Rungs 1–5 (A19 against A17)

| | A17 (shipped v0.1.2) | A19 |
| --- | --- | --- |
| passes | 14/15 | 15/15 |
| requests per run, mean | 12.9 | 13.8 |
| wall s per run, mean | 44 | 51 |

Rung 1 (Node) received no facts; rungs 2–5 received the detected fallback.
No regression.

## The write-list and the import error

| | A18 | A19 | A20 |
| --- | --- | --- | --- |
| runs with a non-empty `outside_write_list` | 8/12 | **0/12** | 5/12 |
| runs with a `No module named 'app'` tool result | 11/12 | 0/12 | 5/12 |
| runs whose first pytest command was the forwarded one | — | 12/12 | 7/12 |

In A20 the five runs that ran the prompt's default first are the five with
the import error; four of them failed, all four with write-list entries
(7 r1 on the write-list alone), and the seven that ran the fallback first
passed six times. The write-list entries
are the same fixes as A18's: `__init__.py`, `pytest.ini`, a root
`conftest.py`, and in one A20 run a `jinja2` dependency added to
`pyproject.toml` before any test ran.

## A20's share of the gain

On rungs 6–9, (A20 − A18) / (A19 − A18) = (7 − 1) / (9 − 1) = **75%**. A
Python project without the section, on this fixture, gets three quarters of
the passes the section gives, at a similar median (28 against 26 requests)
but with five write-list failures against none.

## What the facts did not fix

- **Rung 9 ids.** All four rung-9 failures in A19 and A20 failed the hidden
  phase-4 test on ids: they broke "ids assigned automatically,
  `Complaint(agent_name, text)` still works" (shared `None` or `0` ids, or
  `id` made the first positional field), checked by rerunning the hidden
  tests in the retained workspaces. The visible tests do not cover ids. A18's
  three rung-9 runs also failed the hidden tests; why was not checked there.
- **`from fastapi import RedirectResponse`.** Every rung-8 run in all three
  phases tried that import at least once; the looser spec dropped the
  import hint. A19 8 r1 spent 88 requests on it before passing.
- **Servers in the foreground.** The two deadline hits in A19 and A20 end on
  a foreground `uvicorn` call that bound a port and never returned (that it
  held the run is inferred from the traces). Earlier calls in both runs
  failed with `Address already in use` against servers left by earlier
  deadline runs (see Risks).

## What would falsify this

- A repeat of A19's launch at 4/12 or fewer on rungs 6–9, or with a median
  at or above 50 requests: the 9/12 would be a lucky draw and the ship rule
  would fail.
- A repeat of A19 with a non-empty `outside_write_list`: the section would
  not reliably hold the write-list.
- A repeat of A20 at or below 1/12: the fallback alone would not be worth
  the docs' "without the section, Python projects get `python -m pytest`".

## Risks

- Three repeats per rung. 9/12 against 1/12 is a wide margin, but per-rung
  results (rung 9 at 1/3 in both A19 and A20) and the 75% share are not
  stable estimates.
- Rule 3 changed after A18 ran; A18 enters through its rescored workspaces,
  not a fresh run under the new rule.
- A run's shell reaches the ladder's own virtualenv through `PATH` (bare
  `python` is `ladder/.venv/bin/python`). A20 9 r1 installed `pip`,
  `starlette` and `httpx2` there (the last downloaded); the scorer uses the
  workspace's environment, so scores are not affected as far as checked,
  but the harness environment is no longer clean for later phases.
- Runs share the machine's ports, and the runner does not stop leftover
  servers. Every run that hit the 600 s deadline in A18, A19 and A20 (A18 6 r2, 8 r1, 9 r1; A19 8 r2; A20 6 r2) ended on a server
  started in the foreground, and the runner left it running when it cut
  the run, on ports 8000 to 8003 (A19 8 r2's on `*:8001`, the port
  oMLX serves on at 127.0.0.1). A later run that starts a server meets
  them. Scores are not affected (both affected runs fail for their own
  reasons), and the controller stopped those servers on 2026-10-10 about
  09:50 EDT, after the phases.
- The fixture is one small FastAPI project. A project whose test command is
  not a pytest variant, or whose rules are longer than 600 characters, is
  not measured here.
