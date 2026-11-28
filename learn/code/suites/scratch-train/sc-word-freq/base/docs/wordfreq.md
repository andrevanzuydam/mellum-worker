# wordfreq.py

Create `wordfreq.py` at the project root: it reports the most frequent words in a text file.

- `count_words(text)` returns a list of `(word, count)` pairs for every word in `text`, most frequent first,
  ties in alphabetical order.
  - Words are counted ignoring case and punctuation: a word is a run of letters and digits, and an apostrophe
    inside a word, as in "don't", is kept. Words are reported in lowercase.
- `main(argv=None)` takes `PATH [N]` (N defaults to 10) and prints the N most frequent words of the file, one
  `word count` line each. Run as a script, `uv run python wordfreq.py data/sample.txt 5` calls it.
