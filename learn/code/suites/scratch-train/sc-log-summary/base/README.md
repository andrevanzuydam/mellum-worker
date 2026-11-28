# logstats.py

Create `logstats.py` at the project root: it summarises a web server access log in the format of
`data/access.log` (common log format: the request line is quoted, the status code follows it).

- `summarize(path, top=3)` returns `{"status": {code: count}, "top_paths": [(path, count), ...]}`.
  - `status` counts requests per status code, with the codes as ints.
  - `top_paths` holds the `top` most requested paths, most requests first, ties in alphabetical order.
  - The query string is not part of the path: `/api/items?page=2` counts as `/api/items`.
- `main(argv=None)` takes the log path and an optional `top`, and prints one `code count` line per status
  code (in code order), then one line per top path: the count right-aligned in 5, a space, the path. Run as a
  script, `uv run python logstats.py data/access.log` calls it.
