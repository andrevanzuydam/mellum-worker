from top_words import main, top_words

TEXT = "The cat, the dog. The CAT! A dog."


def test_counts_and_order():
    assert top_words(TEXT, 2) == [("the", 3), ("cat", 2)]


def test_ties_are_alphabetical():
    assert top_words("b a b a", 2) == [("a", 2), ("b", 2)]


def test_min_length():
    assert top_words("a bb a bb ccc", 2, min_length=2) == [("bb", 2), ("ccc", 1)]


def test_main_prints(tmp_path, capsys):
    source = tmp_path / "words.txt"
    source.write_text("a b b")
    main(source, 2)
    assert capsys.readouterr().out.splitlines() == ["b 2", "a 1"]
