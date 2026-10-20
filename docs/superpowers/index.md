# Records

The durable output of the spec-driven cycle. See
[Spec-driven development](../sdd.md) for the cycle itself, the document caps,
and the archive rules.

## Specs — `specs/`

`YYYY-MM-DD-<topic>-design.md`. What is being built and why, including the
alternatives rejected and the reason each lost. A spec that does not name what
it rejected is a description, not a decision record.

## Plans — `plans/`

`YYYY-MM-DD-<topic>.md`, with the front matter in `sdd.md`. Closed and
superseded plans move to `archive/`.

## Research and verdicts — `research/`

`YYYY-MM-DD-<topic>.md`, with a sibling directory for evidence that is not
text. Preregistrations, results and screens (`docs/sdd.md`, "Evals") are
research notes too. Each opens with what is measured and what is conjecture,
and ends with what would falsify it and the risks; notes from before the
SDD scaffold (2026-10-07 and 2026-10-09) may lack the header.

## Nothing here is edited after it lands

Reversals are recorded beside the original, dated.
