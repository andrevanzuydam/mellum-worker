# Tech Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Language | Python 3.14 | `uv` and `uv.lock` |
| Web | fastapi[standard] 0.115.10 | Jinja2, Bootstrap 5 CDN |
| Complaints | in-memory `dataclass` list | ids, status, audit |
| Database | SQLite `data.db` | `tickets` and `visits`; standard-library `sqlite3` |
| Large file | `numbers.txt` | rows of two non-negative integers |
| Tests | pytest + `TestClient` | `uv run python -m pytest tests` |

## Database

`tickets(id INTEGER PRIMARY KEY, status TEXT, archived_at TEXT, cents INTEGER NOT NULL)`

- `archived_at IS NOT NULL` means archived, whatever `status` says. A row can
  be `status='open'` and archived; it counts as archived, never open.
- Migrations are SQL applied to `data.db` with `sqlite3`; keep them idempotent
  (`IF NOT EXISTS`) and never change or delete ticket rows.

`visits(id INTEGER PRIMARY KEY, agent TEXT, date TEXT, minutes INTEGER, ticket_id INTEGER)`

- `date` is `YYYY-MM-DD`; `minutes` is a positive integer.
- Reports filter and sort; do not load the whole table into the prompt.

## Numbers

`numbers.txt` has many rows of two non-negative integers. Sum each column as
an integer; do not load the whole file into the prompt.
