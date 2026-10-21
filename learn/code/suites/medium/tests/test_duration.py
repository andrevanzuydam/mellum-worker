import pytest
from duration import parse_duration


def test_seconds():
    assert parse_duration("45s") == 45


def test_hours():
    assert parse_duration("2h") == 7200


def test_mixed():
    assert parse_duration("1h 30m") == 5400


def test_zero():
    assert parse_duration("0s") == 0


def test_nonsense():
    with pytest.raises(ValueError):
        parse_duration("nonsense")
