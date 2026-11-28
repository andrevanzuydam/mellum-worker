# storage.py

Create `storage.py` at the project root: it writes text files without ever escaping a base directory.

- `safe_write(base_dir, relative, text)` writes `text` to `relative` inside `base_dir`, creating missing
  parent directories, and returns the path it wrote.
- It raises `ValueError`, and writes nothing, when the target would end up outside `base_dir`: through `..`,
  through an absolute path, or through a symlink inside `base_dir` that points elsewhere.
- Paths that stay inside are fine, even with `..` in them: `a/../b.txt` writes `b.txt` in `base_dir`.
