# Snipbox — a snippet app

Build a small FastAPI application called Snipbox, backed by a SQLite database
(use `sqlite-utils`). Implement ALL of the following — every route, column,
status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Snippets (`/snippets`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Snipbox".
- `GET /snippets` lists every row (title, body), ordered by id, and renders an
  add form.

## Create (exact redirect)
- `POST /snippets` reads form fields `title`, `body`, inserts a new row, and
  redirects to `GET /snippets` using status code 303.

## Pin and Unpin (both endpoints)
- `POST /snippets/{snippet_id}/pin` sets `pinned` to 1 and redirects to `/snippets`
  with status 303.
- `POST /snippets/{snippet_id}/unpin` sets `pinned` to 0 and redirects to `/snippets`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_language` — add a `language` text column defaulting to `text`.
- `004_index_pinned` — create an index named `idx_snippets_pinned` on `snippets(pinned)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `pinned`,
  `unpinned`, all integers, where `total == pinned + unpinned`.
