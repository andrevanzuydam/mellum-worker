# Stacks — a books app

Build a small FastAPI application called Stacks, backed by a SQLite database
(use `sqlite-utils`). Implement ALL of the following — every route, column,
status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Books (`/books`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Stacks".
- `GET /books` lists every row (title, author), ordered by id, and renders an
  add form.

## Create (exact redirect)
- `POST /books` reads form fields `title`, `author`, inserts a new row, and
  redirects to `GET /books` using status code 303.

## Shelve and Unshelve (both endpoints)
- `POST /books/{book_id}/shelve` sets `shelved` to 1 and redirects to `/books`
  with status 303.
- `POST /books/{book_id}/unshelve` sets `shelved` to 0 and redirects to `/books`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_pages` — add a `pages` integer column defaulting to 0.
- `004_index_shelved` — create an index named `idx_books_shelved` on `books(shelved)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `shelved`,
  `unshelved`, all integers, where `total == shelved + unshelved`.
