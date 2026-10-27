# Wander — a trip app

Build a small FastAPI application called Wander, backed by a SQLite database
(use `sqlite-utils`). Implement ALL of the following — every route, column,
status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Trips (`/trips`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Wander".
- `GET /trips` lists every row (place, when_at), ordered by id, and renders an
  add form.

## Create (exact redirect)
- `POST /trips` reads form fields `place`, `when_at`, inserts a new row, and
  redirects to `GET /trips` using status code 303.

## Book and Unbook (both endpoints)
- `POST /trips/{trip_id}/book` sets `booked` to 1 and redirects to `/trips`
  with status 303.
- `POST /trips/{trip_id}/unbook` sets `booked` to 0 and redirects to `/trips`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_nights` — add a `nights` integer column defaulting to 1.
- `004_index_booked` — create an index named `idx_trips_booked` on `trips(booked)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `booked`,
  `unbooked`, all integers, where `total == booked + unbooked`.
