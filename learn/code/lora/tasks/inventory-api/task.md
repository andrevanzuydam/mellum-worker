# Stockroom — an inventory tracker

Build a small FastAPI application called Stockroom that tracks stock items,
backed by a SQLite database (use `sqlite-utils`). Implement ALL of the
following — every route, column, status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Items (`/items`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Stockroom".
- `GET /items` lists every item (name, sku, quantity), ordered by id, and
  renders an add form.

## Create (exact redirect)
- `POST /items` reads form fields `name`, `sku`, and `quantity`, inserts a new
  item, and redirects to `GET /items` using status code 303.

## Flag and unflag (both endpoints)
- `POST /items/{item_id}/flag` sets the item's `flagged` to 1 and redirects to
  `/items` with status 303.
- `POST /items/{item_id}/unflag` sets `flagged` to 0 and redirects to `/items`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_location` — add a `location` text column defaulting to `unknown`.
- `004_index_flagged` — create an index named `idx_items_flagged` on
  `items(flagged)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `flagged`,
  `unflagged`, all integers, where `total == flagged + unflagged`.
