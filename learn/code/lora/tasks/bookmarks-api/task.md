# Markpile — a bookmark keeper

Build a small FastAPI application called Markpile that keeps web bookmarks,
backed by a SQLite database (use `sqlite-utils`). Implement ALL of the
following — every route, column, status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Bookmarks (`/bookmarks`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Markpile".
- `GET /bookmarks` lists every bookmark (title and url), ordered by id, and
  renders an add form.

## Create (exact redirect)
- `POST /bookmarks` reads form fields `title` and `url`, inserts a new
  bookmark, and redirects to `GET /bookmarks` using status code 303.

## Pin and unpin (both endpoints)
- `POST /bookmarks/{bookmark_id}/pin` sets the bookmark's `pinned` to 1 and
  redirects to `/bookmarks` with status 303.
- `POST /bookmarks/{bookmark_id}/unpin` sets `pinned` to 0 and redirects to
  `/bookmarks` with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_color` — add a `color` text column defaulting to `white`.
- `004_index_pinned` — create an index named `idx_bookmarks_pinned` on
  `bookmarks(pinned)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `pinned`,
  `unpinned`, all integers, where `total == pinned + unpinned`.
