# mellum-worker — agent notes

This repo ships the measured "Mellum as a bounded coding worker" recipe for
Pi and OpenCode. Read [`README.md`](README.md) first. The numbers come from
the research repo, [mellum-mlx](https://github.com/pauleveritt/mellum-mlx);
this repo does not re-derive them.

## Spec-driven development

This project runs Superpowers SDD: brainstorm → spec → plan → execute →
review/close. **Read [`docs/sdd.md`](docs/sdd.md) before writing any spec,
plan, or roadmap edit**; it carries the document caps and why each exists.

- Specs: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- Plans: `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`
- Research: `docs/superpowers/research/YYYY-MM-DD-<topic>.md`

[`ROADMAP.md`](ROADMAP.md) is the phase list and current pointer;
[`BACKLOG.md`](BACKLOG.md) is deferred work with reopen conditions. Brainstorm
within a phase; do not re-open settled, measured decisions without a ladder
run in mellum-mlx.

## Document caps are not advisory

`ROADMAP.md` caps at 400 lines; a Ships or Excludes cell at 900 characters, a
Status cell at 1,000, a backlog entry at 1,200, a plan at 400 lines and 25%
fenced, a spec at 400 lines. `tests/docs-caps.test.mjs` enforces them. Over
cap means a research doc is owed, not that the wording gets trimmed.

## Working rules

- `npm test` runs the suite; every new test is shown to fail first.
- `node build.mjs` regenerates the agent templates after a prompt change, and
  a test fails on drift. `prompts/mellum-worker.md` is the only prompt source.
- Never add a `build`, `prepare`, `prepack`, or `install` npm script; OpenCode
  installs from Git through pacote and that breaks the install.
- A release is a tag that matches `package.json` and both README install
  lines, with a `CHANGELOG.md` section.

## Finishing a phase

Update the phase's Status cell and the `## Now` pointer in `ROADMAP.md`, close
the plan with `## Result`, move it to `plans/archive/`, and remove any backlog
entry the phase resolved. This is a standing rule.
