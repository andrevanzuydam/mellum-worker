# config.py

Create `config.py` at the project root: it loads the application configuration from layered JSON.

- `merge(base, other)` returns a new dict with `other` merged deeply onto `base`: nested dicts merge at any
  depth, while lists and other values in `other` replace the old value. It never changes `base` or `other`.
- `load_config(defaults_path, user_path=None, overrides=None)` reads the defaults file (like
  `data/defaults.json`), merges the user file on top (like `data/user.json`; skipped when `user_path` is None
  or the file does not exist), then merges the `overrides` dict on top, and returns the result.
- Run as a script, `uv run python config.py data/defaults.json data/user.json` prints the merged
  configuration as indented JSON.
