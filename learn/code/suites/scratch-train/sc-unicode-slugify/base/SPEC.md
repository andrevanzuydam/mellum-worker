# Slugs for file names

Two files are involved: create `slug.py` at the project root, and change the existing `filenames.py`.

- `slug.py`: `slugify(text)` normalises `text` with NFKD, drops the combining accents (so "Crème Brûlée"
  becomes "creme-brulee"), lower-cases it, turns every run of characters outside a-z and 0-9 into a single
  "-", and strips "-" from both ends.
- `filenames.py`: `safe_filename(title, ext="txt")` must build its stem with `slugify`, so accented titles get
  readable names. Every ASCII title keeps exactly the file name it gets today, and a title with nothing left
  still becomes `untitled.<ext>`.
