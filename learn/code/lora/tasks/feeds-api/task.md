# Riverrun — a feed app

Build a small FastAPI application called Riverrun, backed by a SQLite database
(use `sqlite-utils`). Implement ALL of the following — every route, column,
status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Feeds (`/feeds`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Riverrun".
- `GET /feeds` lists every row (title, url), ordered by id, and renders an
  add form.

## Create (exact redirect)
- `POST /feeds` reads form fields `title`, `url`, inserts a new row, and
  redirects to `GET /feeds` using status code 303.

## Subscribe and Unsubscribe (both endpoints)
- `POST /feeds/{feed_id}/subscribe` sets `subscribed` to 1 and redirects to `/feeds`
  with status 303.
- `POST /feeds/{feed_id}/unsubscribe` sets `subscribed` to 0 and redirects to `/feeds`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_folder` — add a `folder` text column defaulting to ``.
- `004_index_subscribed` — create an index named `idx_feeds_subscribed` on `feeds(subscribed)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `subscribed`,
  `unsubscribed`, all integers, where `total == subscribed + unsubscribed`.
