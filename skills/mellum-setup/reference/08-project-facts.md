# Phase 8: Project facts for Mellum Mode (optional)

Why: on the ladder's four AgentClinic rungs (build a small FastAPI app from
loose phase specs, 12 runs per condition), Mellum Mode passed 9 of 12 runs
with this section and 1 of 12 without it (rescored under the added-tests
rule; 0 of 12 under the strict rule that run used), at a median of 26
requests against 50.

Pi only: Mellum Mode is what reads the section; OpenCode has no Mode, so
skip this phase there. Like phase 6, this is always a question, never an
automatic write: AGENTS.md belongs to the user's project. It applies to
the project the user runs `pi` in (Mode reads `AGENTS.md` from that
working directory), not to `$PKG`.

Check: the project's `AGENTS.md` already has a heading that is exactly
`## Mellum`, or the user declined. Phase 6's `## Mellum Worker` heading
does not count; Mode reads only the exact heading.

```bash
grep -nE '^##[[:space:]]+Mellum[[:space:]]*$' AGENTS.md
```

Ask: "Do you want a `## Mellum` section in this project's AGENTS.md, so
Mellum Mode is told the project's test command?"

If yes:

1. Ask for the test command: the one that runs the project's tests from
   its root, exactly as typed. If the user is unsure, offer to run their
   candidate once and show the result; a command that cannot import the
   project's code is what this section prevents. For a project whose
   `pyproject.toml` mentions pytest, Mode already falls back to
   `uv run --offline python -m pytest -q` when the section names no test
   command; say so.
2. Offer two optional lines: `Write only:` (the files and directories
   Mellum may create or change) and `Do not:` (for example, install
   packages or add dependencies; weaken tests).
3. Show the section, filled in, for example:

```markdown
## Mellum

- Test command: uv run python -m pytest tests
- Write only: app.py, models.py, templates/, tests/
- Do not: install packages or add dependencies; remove or rewrite routes that already work; weaken tests
```

4. Ask before writing. On a yes, append it to the end of `AGENTS.md`
   (create the file if absent). Mode reads only bullets, and the section
   ends at the next `#` or `##` heading. Keep the bullet text to at most
   600 characters; over that, Mode warns and ignores the whole section.

If no, record that the user declined and move on.

Tell the user: the next `/mellum` in that project shows
`[mellum-mode on] facts: agents-md` (or `agents-md+detected` when the
section has no test command and the fallback was added), and the handoff
summary line names the same source. `MELLUM_MODE_FACTS=0` in the
environment turns the section and the fallback off.
