# inventory.py

Create `inventory.py` at the project root: a command that lists stock items from a CSV file.

- The CSV has a header row and the columns `name` and `qty` (an integer), like `data/items.csv`.
- `main(argv=None)` parses the arguments (from `sys.argv` when `argv` is None) and prints the result; the file
  runs `main()` when executed, so `uv run python inventory.py data/items.csv` works.
- Arguments:
  - `path`: the CSV file (required);
  - `--sort name|qty`: `name` sorts A to Z (the default); `qty` sorts largest first, equal quantities by name;
  - `--limit N`: show at most N items, applied after sorting;
  - `--format text|json`: `text` (the default) prints one item per line, the name left-aligned in 12
    characters then the quantity right-aligned in 6; `json` prints the items as a JSON list of
    `{"name": ..., "qty": ...}` objects, with `qty` as a number.
