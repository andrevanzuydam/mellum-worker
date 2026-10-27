# Reel — a movie app

Build a small FastAPI application called Reel, backed by a SQLite database
(use `sqlite-utils`). Implement ALL of the following — every route, column,
status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Movies (`/movies`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Reel".
- `GET /movies` lists every row (title, director), ordered by id, and renders an
  add form.

## Create (exact redirect)
- `POST /movies` reads form fields `title`, `director`, inserts a new row, and
  redirects to `GET /movies` using status code 303.

## Watch and Unwatch (both endpoints)
- `POST /movies/{movie_id}/watch` sets `watched` to 1 and redirects to `/movies`
  with status 303.
- `POST /movies/{movie_id}/unwatch` sets `watched` to 0 and redirects to `/movies`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_runtime` — add a `runtime` integer column defaulting to 0.
- `004_index_watched` — create an index named `idx_movies_watched` on `movies(watched)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `watched`,
  `unwatched`, all integers, where `total == watched + unwatched`.
