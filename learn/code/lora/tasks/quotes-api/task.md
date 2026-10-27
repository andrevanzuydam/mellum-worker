# Commonplace — a quote app

Build a small FastAPI application called Commonplace, backed by a SQLite database
(use `sqlite-utils`). Implement ALL of the following — every route, column,
status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Quotes (`/quotes`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Commonplace".
- `GET /quotes` lists every row (body, author), ordered by id, and renders an
  add form.

## Create (exact redirect)
- `POST /quotes` reads form fields `body`, `author`, inserts a new row, and
  redirects to `GET /quotes` using status code 303.

## Love and Unlove (both endpoints)
- `POST /quotes/{quote_id}/love` sets `loved` to 1 and redirects to `/quotes`
  with status 303.
- `POST /quotes/{quote_id}/unlove` sets `loved` to 0 and redirects to `/quotes`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_origin` — add a `origin` text column defaulting to ``.
- `004_index_loved` — create an index named `idx_quotes_loved` on `quotes(loved)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `loved`,
  `unloved`, all integers, where `total == loved + unloved`.
