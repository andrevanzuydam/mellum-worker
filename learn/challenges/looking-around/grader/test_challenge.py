"""E1 Looking Around's lesson challenge, hidden grader. The data file is past what one `read` or
`cat` shows, so the answer has to be found by searching, not by looking again; a session stuck
re-reading the same view never reaches step 2."""

from pathlib import Path

from lookup import reading


def test_the_answer_was_found():
    saved = Path("answer.txt")
    assert saved.is_file(), "answer.txt was not written"
    assert saved.read_text().strip() == "923"


def test_reading_finds_a_sensor():
    assert reading("S-03171") == 923
    assert reading("S-07495") == 246


def test_reading_is_an_int():
    assert isinstance(reading("S-03171"), int)


def test_an_unknown_sensor_is_none():
    assert reading("S-99999") is None
