# Shopfront — a product app

Build a small FastAPI application called Shopfront, backed by a SQLite database
(use `sqlite-utils`). Implement ALL of the following — every route, column,
status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Products (`/products`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Shopfront".
- `GET /products` lists every row (name, sku), ordered by id, and renders an
  add form.

## Create (exact redirect)
- `POST /products` reads form fields `name`, `sku`, inserts a new row, and
  redirects to `GET /products` using status code 303.

## Feature and Unfeature (both endpoints)
- `POST /products/{product_id}/feature` sets `featured` to 1 and redirects to `/products`
  with status 303.
- `POST /products/{product_id}/unfeature` sets `featured` to 0 and redirects to `/products`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_price` — add a `price` integer column defaulting to 0.
- `004_index_featured` — create an index named `idx_products_featured` on `products(featured)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `featured`,
  `unfeatured`, all integers, where `total == featured + unfeatured`.
