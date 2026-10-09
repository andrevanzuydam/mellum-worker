"""Raw-evidence archiver: deterministic per-phase tarballs of raw run files."""

import tarfile
from pathlib import Path

from ladder.archive_raw import add_readme_link, archive_phase, sha256

LINK = (
    "Raw traces, stdout and diffs: [`p1.tar.gz`]"
    "(https://github.com/pauleveritt/mellum-worker/releases/download/"
    "research-2026-10-09/p1.tar.gz)."
)


def make_phase(root: Path, name: str = "p1", raw: bool = True) -> Path:
    phase = root / name
    (phase / "r1").mkdir(parents=True)
    (phase / "README.md").write_text("# Phase\n")
    (phase / "table.md").write_text("| a |\n")
    (phase / "r1" / "run.json").write_text("{}\n")
    if raw:
        (phase / "r1" / "trace.jsonl").write_text("{}\n")
        (phase / "r1" / "stdout.txt").write_text("out\n")
        (phase / "r1" / "diff.patch").write_text("diff\n")
    return phase


def test_tarball_holds_only_raw_files_sorted(tmp_path):
    phase = make_phase(tmp_path)
    out = tmp_path / "out"
    tarball = archive_phase(phase, out)
    assert tarball == out / "p1.tar.gz"
    with tarfile.open(tarball) as tar:
        assert tar.getnames() == [
            "p1/r1/diff.patch",
            "p1/r1/stdout.txt",
            "p1/r1/trace.jsonl",
        ]


def test_archiving_twice_gives_the_same_hash(tmp_path):
    phase = make_phase(tmp_path)
    first = sha256(archive_phase(phase, tmp_path / "a"))
    second = sha256(archive_phase(phase, tmp_path / "b"))
    assert first == second


def test_phase_without_raw_files_writes_nothing(tmp_path):
    phase = make_phase(tmp_path, raw=False)
    out = tmp_path / "out"
    assert archive_phase(phase, out) is None
    assert not out.exists() or list(out.iterdir()) == []


def test_add_readme_link_appends_once(tmp_path):
    readme = tmp_path / "README.md"
    readme.write_text("# Phase\n")
    assert add_readme_link(readme, "p1", "research-2026-10-09") is True
    text = readme.read_text()
    assert text == f"# Phase\n\n{LINK}\n"
    assert add_readme_link(readme, "p1", "research-2026-10-09") is False
    assert readme.read_text() == text
