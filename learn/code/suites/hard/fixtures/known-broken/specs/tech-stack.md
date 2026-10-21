# Tech Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Language | Python 3.14 | `uv` and `uv.lock` |
| Web | fastapi[standard] 0.115.10 | Jinja2 templates, Bootstrap 5 CDN |
| Data | in-memory `dataclass` list | complaints, ids, status, audit |
| Database | SQLite `data.db` | a `tickets` table; use the standard library `sqlite3` |
| Large file | `numbers.txt` | rows of two space-separated non-negative integers |
| Tests | pytest + `TestClient` | `uv run python -m pytest tests` |

## Database

`tickets(id INTEGER PRIMARY KEY, status TEXT NOT NULL, archived_at TEXT, cents INTEGER NOT NULL)`

- `archived_at IS NOT NULL` means archived, whatever `status` says. A row can
  be `status='open'` and archived; it counts as archived, never open.
- Migrations are SQL applied to `data.db` with `sqlite3`; keep them in
  `migrations/` and make them idempotent (`IF NOT EXISTS`). Never change or
  delete ticket rows.
- The file is larger than the context window; read only what you need.

## Numbers

`numbers.txt` has many rows of two non-negative integers. Sum each column as
an integer; do not load the whole file into the prompt.
