# Crate — a music app

Build a small FastAPI application called Crate, backed by a SQLite database
(use `sqlite-utils`). Implement ALL of the following — every route, column,
status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Tracks (`/tracks`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Crate".
- `GET /tracks` lists every row (title, artist), ordered by id, and renders an
  add form.

## Create (exact redirect)
- `POST /tracks` reads form fields `title`, `artist`, inserts a new row, and
  redirects to `GET /tracks` using status code 303.

## Like and Unlike (both endpoints)
- `POST /tracks/{track_id}/like` sets `liked` to 1 and redirects to `/tracks`
  with status 303.
- `POST /tracks/{track_id}/unlike` sets `liked` to 0 and redirects to `/tracks`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_duration` — add a `duration` integer column defaulting to 0.
- `004_index_liked` — create an index named `idx_tracks_liked` on `tracks(liked)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `liked`,
  `unliked`, all integers, where `total == liked + unliked`.
