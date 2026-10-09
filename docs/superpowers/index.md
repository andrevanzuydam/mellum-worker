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

`YYYY-MM-DD-<topic>.md`, with `-finding.md` for a measured result and a
sibling directory for evidence. Each opens with what is measured and what is
conjecture, and ends with what would falsify it and the risks.

## Nothing here is edited after it lands

Reversals are recorded beside the original, dated.
