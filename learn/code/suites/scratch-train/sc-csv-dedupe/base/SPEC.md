# cleaner.py

Create `cleaner.py` at the project root: it cleans a CSV export of customer records.

- `dedupe(in_path, out_path, key="id", stamp="updated_at")` reads the CSV at `in_path` (like
  `data/sample.csv`) and writes `out_path` with one row per `key`.
- For each key it keeps the row with the newest `stamp` (ISO 8601 timestamps); the input is not sorted by
  time, so the newest row may come before or after older ones.
- Rows come out in the order each key first appears, with the same header and columns as the input.
- Run as a script, `uv run python cleaner.py data/sample.csv out.csv` dedupes the first file into the second.
