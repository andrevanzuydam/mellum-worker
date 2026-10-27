# Hub — a device app

Build a small FastAPI application called Hub, backed by a SQLite database
(use `sqlite-utils`). Implement ALL of the following — every route, column,
status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Devices (`/devices`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Hub".
- `GET /devices` lists every row (name, kind), ordered by id, and renders an
  add form.

## Create (exact redirect)
- `POST /devices` reads form fields `name`, `kind`, inserts a new row, and
  redirects to `GET /devices` using status code 303.

## Pair and Unpair (both endpoints)
- `POST /devices/{device_id}/pair` sets `paired` to 1 and redirects to `/devices`
  with status 303.
- `POST /devices/{device_id}/unpair` sets `paired` to 0 and redirects to `/devices`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_room` — add a `room` text column defaulting to ``.
- `004_index_paired` — create an index named `idx_devices_paired` on `devices(paired)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `paired`,
  `unpaired`, all integers, where `total == paired + unpaired`.
