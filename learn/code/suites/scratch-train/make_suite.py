"""Build scratch-train: tools-train tasks with the target module removed, so the run starts from a spec.

Each task copies its tools-train source (base, grader, expected.json, layout.json, task.json), deletes the module
the spec asks for, writes the spec to base/specs/, and replaces the prompt. The grader is unchanged. Re-run to
rebuild; it refuses nothing and overwrites only the sc-* folders it owns.

    uv run python learn/code/suites/scratch-train/make_suite.py
"""
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "tools-train"

# Where the spec lives and how the request is worded vary by task, so no one folder name or phrasing becomes the
# cue: the skill being taught is "read the spec wherever it is, then write the file it names". The wording is our
# own, not a remedy's or an eval suite's.
PLACES = [
    ("specs/{name}", "Build the module described in `{spec}`. Put it where the spec says, add tests in `tests/`, "
                     "and run them."),
    ("docs/{name}", "`{spec}` describes a module this project still needs. Write it, add tests under `tests/`, and "
                    "run the test command."),
    ("SPEC.md", "The specification in `{spec}` is not implemented yet. Implement it and cover it with tests in "
                "`tests/`; run them before you stop."),
    ("README.md", "Read `{spec}` and build what it describes, with tests in `tests/`. Run the tests when you are "
                  "done."),
]

SPECS = {
    "tt-cli-limit-format": ("inventory.py", "inventory.md", """# inventory.py

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
"""),
    "tt-config-merge": ("config.py", "config.md", """# config.py

Create `config.py` at the project root: it loads the application configuration from layered JSON.

- `merge(base, other)` returns a new dict with `other` merged deeply onto `base`: nested dicts merge at any
  depth, while lists and other values in `other` replace the old value. It never changes `base` or `other`.
- `load_config(defaults_path, user_path=None, overrides=None)` reads the defaults file (like
  `data/defaults.json`), merges the user file on top (like `data/user.json`; skipped when `user_path` is None
  or the file does not exist), then merges the `overrides` dict on top, and returns the result.
- Run as a script, `uv run python config.py data/defaults.json data/user.json` prints the merged
  configuration as indented JSON.
"""),
    "tt-csv-dedupe": ("cleaner.py", "cleaner.md", """# cleaner.py

Create `cleaner.py` at the project root: it cleans a CSV export of customer records.

- `dedupe(in_path, out_path, key="id", stamp="updated_at")` reads the CSV at `in_path` (like
  `data/sample.csv`) and writes `out_path` with one row per `key`.
- For each key it keeps the row with the newest `stamp` (ISO 8601 timestamps); the input is not sorted by
  time, so the newest row may come before or after older ones.
- Rows come out in the order each key first appears, with the same header and columns as the input.
- Run as a script, `uv run python cleaner.py data/sample.csv out.csv` dedupes the first file into the second.
"""),
    "tt-log-summary": ("logstats.py", "logstats.md", """# logstats.py

Create `logstats.py` at the project root: it summarises a web server access log in the format of
`data/access.log` (common log format: the request line is quoted, the status code follows it).

- `summarize(path, top=3)` returns `{"status": {code: count}, "top_paths": [(path, count), ...]}`.
  - `status` counts requests per status code, with the codes as ints.
  - `top_paths` holds the `top` most requested paths, most requests first, ties in alphabetical order.
  - The query string is not part of the path: `/api/items?page=2` counts as `/api/items`.
- `main(argv=None)` takes the log path and an optional `top`, and prints one `code count` line per status
  code (in code order), then one line per top path: the count right-aligned in 5, a space, the path. Run as a
  script, `uv run python logstats.py data/access.log` calls it.
"""),
    "tt-safe-writer": ("storage.py", "storage.md", """# storage.py

Create `storage.py` at the project root: it writes text files without ever escaping a base directory.

- `safe_write(base_dir, relative, text)` writes `text` to `relative` inside `base_dir`, creating missing
  parent directories, and returns the path it wrote.
- It raises `ValueError`, and writes nothing, when the target would end up outside `base_dir`: through `..`,
  through an absolute path, or through a symlink inside `base_dir` that points elsewhere.
- Paths that stay inside are fine, even with `..` in them: `a/../b.txt` writes `b.txt` in `base_dir`.
"""),
    "tt-word-freq": ("wordfreq.py", "wordfreq.md", """# wordfreq.py

Create `wordfreq.py` at the project root: it reports the most frequent words in a text file.

- `count_words(text)` returns a list of `(word, count)` pairs for every word in `text`, most frequent first,
  ties in alphabetical order.
  - Words are counted ignoring case and punctuation: a word is a run of letters and digits, and an apostrophe
    inside a word, as in "don't", is kept. Words are reported in lowercase.
- `main(argv=None)` takes `PATH [N]` (N defaults to 10) and prints the N most frequent words of the file, one
  `word count` line each. Run as a script, `uv run python wordfreq.py data/sample.txt 5` calls it.
"""),
    "tt-unicode-slugify": ("slug.py", "slugs.md", """# Slugs for file names

Two files are involved: create `slug.py` at the project root, and change the existing `filenames.py`.

- `slug.py`: `slugify(text)` normalises `text` with NFKD, drops the combining accents (so "Crème Brûlée"
  becomes "creme-brulee"), lower-cases it, turns every run of characters outside a-z and 0-9 into a single
  "-", and strips "-" from both ends.
- `filenames.py`: `safe_filename(title, ext="txt")` must build its stem with `slugify`, so accented titles get
  readable names. Every ASCII title keeps exactly the file name it gets today, and a title with nothing left
  still becomes `untitled.<ext>`.
"""),
}


def build():
    for n, (task, (module, spec_name, spec)) in enumerate(SPECS.items()):
        place, prompt = PLACES[n % len(PLACES)]
        spec_path = place.format(name=spec_name)
        src, dst = SRC / task, HERE / ("sc-" + task.removeprefix("tt-"))
        if dst.exists():
            shutil.rmtree(dst)
        dst.mkdir()
        for name in ("grader", "base"):
            shutil.copytree(src / name, dst / name)
        for name in ("expected.json", "layout.json"):
            shutil.copy(src / name, dst / name)
        meta = json.loads((src / "task.json").read_text())
        (dst / "task.json").write_text(json.dumps({**meta, "kind": "build", "from": task}) + "\n")
        (dst / "base" / module).unlink()
        target = dst / "base" / spec_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(spec)
        (dst / "prompts").mkdir()
        (dst / "prompts" / "01.md").write_text(prompt.format(spec=spec_path) + "\n")
        print(dst.name, "->", module, "| spec", spec_path)


if __name__ == "__main__":
    build()
