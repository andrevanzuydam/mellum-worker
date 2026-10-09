# Provenance of the phase records

The phase records in this directory were moved here from the research
repository.

- Source repository: https://github.com/pauleveritt/mellum-mlx (local
  checkout read-only; nothing in it was changed).
- Source path: `docs/research/ladder/`.
- Source commit: `4b0f7e58a5ac0b10bfe678cce465c378d70161b1`.
- Moved: 2026-10-09 (phase M.6, one repo).
- Release tag for the raw evidence: `research-2026-10-09`.

## What was copied

Tracked files at that commit, via `git archive`, minus the raw files:
30 phase directories (A0 to A17 and the earlier phases) plus
`ablation-summary.md`.

- Per run directory: `run.json`, `final.md`, `brief.md`.
- Per phase: `README.md`, `table.md`.
- Each phase `README.md` gains one final line linking its tarball.
  Three phases had no README (`phase0-baseline-attempt1`,
  `phase1b-tuned-nopenalty-v3`, `phase2-guards-v3-attempt1`); each got
  one holding its name and that link.

## Moved research notes

The recovery README under `docs/superpowers/research/2026-10-07-mellum-recovery/`
gained the Moved-from line, and its line in `manifest.sha256` was updated to
match; `shasum -a 256 -c manifest.sha256` passes there. The `.zip` beside the
directory keeps the byte-original bundle. Paths quoted inside the moved notes
(for example `ladder/run_ladder.py`, `ladder/briefs/`) are pre-move paths, now
under `ladder/ladder/`.

## What was not copied

The raw files `trace.jsonl`, `stdout.txt` and `diff.patch` (450 each,
about 380 MB). They are archived per phase instead and listed in
`.gitignore`, so new runs write them locally without committing them.
Every one of the 30 phases had raw files, so there are 30 tarballs.

A 31st phase, `smoke-m6-one-repo`, was added after the move: one rung-1 Mellum
Mode run launched from this checkout (2026-10-09, commit `e5e72f3`). It is
not part of the moved set, so it has no source commit; its raw files were
archived the same way, giving 31 tarballs in all.

Before the tarballs were built, `git status --short --ignored
docs/research/ladder` in the source checkout was empty and its HEAD was
the commit above, so the working tree matched the commit.

## Raw archives

One `<phase>.tar.gz` per phase directory, holding the raw files at their
original relative paths (`<phase>/<run>/trace.jsonl`, and so on). Names
sorted, mtime 0, owner and group empty, mode 0644, so the same inputs give
the same hash. Each is attached to the `research-2026-10-09` release at
`https://github.com/pauleveritt/mellum-worker/releases/download/research-2026-10-09/<phase>.tar.gz`.

The tarballs stay in the maintainer's scratch directory until the release
is created and they are uploaded.

Rebuild one or all from a checkout of the source commit:

    cd ladder
    uv run python -m ladder.archive_raw --out OUT_DIR --tag research-2026-10-09 PATH_TO_SOURCE/docs/research/ladder/*/

The command prints `<phase> <sha256>` per tarball; compare with the table.

| phase | tarball | sha256 |
| --- | --- | --- |
| ablation-a0-replace | `ablation-a0-replace.tar.gz` | `63ffeb5c7a558e86b1f1cf1dcc5ca7030acf6967a2cbf677b0d0a42c0a02d4d7` |
| ablation-a1-noguards | `ablation-a1-noguards.tar.gz` | `21544904efac2251c0e4023cf7d6e48a9055b3c4a46c9709322b23cdae7b4880` |
| ablation-a10-delegated-v5 | `ablation-a10-delegated-v5.tar.gz` | `f4b7a5352604c9646cafd1a5bec8766caa6da8f08a9e54b493eb2c039518b248` |
| ablation-a11-delegated-nointercom | `ablation-a11-delegated-nointercom.tar.gz` | `7c3910b5871ff777f7f5bc16539570b01a440d0d1179d784abe1154772d57224` |
| ablation-a12-strip-thinking | `ablation-a12-strip-thinking.tar.gz` | `0da3fe7e1a00f2a3e54f901a86af6108f2967bf6a8044a3e95240dcd754bcea1` |
| ablation-a13-budget-medium | `ablation-a13-budget-medium.tar.gz` | `01409a5822cafb1cb80f6ffe9b2cce4e25aeee22f2366f4a6aab76d783e8c0a6` |
| ablation-a14-mellum-mode | `ablation-a14-mellum-mode.tar.gz` | `062a5dc0708ac160b43c0aa0d1236d14051dd7adc980f8cb196608f37a7aa331` |
| ablation-a15-chunked-brief | `ablation-a15-chunked-brief.tar.gz` | `42130b076ed17a8ef3d9bcff4936bdb3d8252c5eaa597b3a4fdfa43e2d7f8f27` |
| ablation-a16-brief-one-prompt | `ablation-a16-brief-one-prompt.tar.gz` | `a96020c95967dff7dbdcb4a3640883547cc233230e3b0f2da12ee941735904d7` |
| ablation-a17-mode-v012 | `ablation-a17-mode-v012.tar.gz` | `12f563de4375ca62bdb5d4765530ad4923cef11c5447640471c9ac5620659256` |
| ablation-a2-v4a | `ablation-a2-v4a.tar.gz` | `85c0951f52856afcfdc8d57485ee829165cec4ec0cf99ae4d168788df1aca343` |
| ablation-a3-v4b | `ablation-a3-v4b.tar.gz` | `fb0508b980fef528b914332fd1046670a8ef9edcb2121b6463dac1b4a43afc67` |
| ablation-a4-v4c | `ablation-a4-v4c.tar.gz` | `bcf0b0e5dce191445c61b5b65d0f395ffc0a8f714bdbfd99f10a29ff2304e7e2` |
| ablation-a5-thinking-medium | `ablation-a5-thinking-medium.tar.gz` | `467764a4b245338b6a3e50ef8ed1dbf855cb8f6b3acefeb96ba3749c4124700a` |
| ablation-a8-delegated-lean | `ablation-a8-delegated-lean.tar.gz` | `8e777e369cee88a0e867c63f4483aa8ca0f31cb11859b006ffb8a2549c2200ce` |
| ablation-a9-delegated-final | `ablation-a9-delegated-final.tar.gz` | `6a7973a19c457dc11abb84a431ced0d535358486e45fcfe3329d5fb9b9f90758` |
| phase0-baseline-attempt1 | `phase0-baseline-attempt1.tar.gz` | `b949633747eb1509a9d906c7cf9a69e2f37d3e2ae18cb01897bd1338e4986a19` |
| phase0-baseline | `phase0-baseline.tar.gz` | `e0aa596d940da77ebeeb6a5bddbd91e24c28bf44f68a919591e6ac9b9fcf4283` |
| phase0b-baseline-v3 | `phase0b-baseline-v3.tar.gz` | `b46f19c356c4580540d7655f1abea143b1c4f4bcc8a4a8657dd549141e4ed5bc` |
| phase0c-primary-operator | `phase0c-primary-operator.tar.gz` | `76bde981799dcbd600ff838d2690046bcd7895809acb15b788e33eec353144ec` |
| phase0c-primary-plain | `phase0c-primary-plain.tar.gz` | `6b960750bf29826cabd05348840945e30101e7b93ef774c2e7d80df4ee2ab6fb` |
| phase1-tuned-v3 | `phase1-tuned-v3.tar.gz` | `f3122e4bf0e203cdb2abc512b6909cac4917cfb15c68ba7139e79fcbfc53f6d5` |
| phase1b-tuned-nopenalty-v3 | `phase1b-tuned-nopenalty-v3.tar.gz` | `05a5f693f1b1cba432cac7802009c241ac19eefe3699edff2c2434f989e4b681` |
| phase1c-baseline-greedy | `phase1c-baseline-greedy.tar.gz` | `828abbbf3b85f8295ec49dc83b9e441c5ab812ac0df478abe4e8ad92ecd18364` |
| phase1d-tuned-effective | `phase1d-tuned-effective.tar.gz` | `7564d6647b4f8a58ca7b0e372f8e7455baea2db233867b8858aaf9e01d57169c` |
| phase2-guards-v3-attempt1 | `phase2-guards-v3-attempt1.tar.gz` | `c16804efdfb37848081f5147610caadd388d0dde0d4d49d3eb959bd0de56f878` |
| phase2-guards-v3 | `phase2-guards-v3.tar.gz` | `cd6f5def393ff9abfe91de80267c69f39343dd677ae434b16b5393410947b9d2` |
| phase2b-guards-bounded | `phase2b-guards-bounded.tar.gz` | `9049222a168013e921a2fe221cfa38da371775eb1230fc0b93a9638d7b186f08` |
| phase3a-delegated-noskill | `phase3a-delegated-noskill.tar.gz` | `bc1997d958a0934d7a38973f36692c279d8632605665f7435cc6982a9239cf8e` |
| phase3b-delegated-skill | `phase3b-delegated-skill.tar.gz` | `1da9291896c9246b24770786d27b3bac6f18b4282daf2efb8d962febf0cd5d9a` |
| smoke-m6-one-repo | `smoke-m6-one-repo.tar.gz` | `b68eb25192c06676486be6bba7fdb18c25315a8438c3a648c88edae2d918ef0c` |
