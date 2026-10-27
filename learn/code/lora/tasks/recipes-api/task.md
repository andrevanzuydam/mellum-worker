# Pantry — a recipe app

Build a small FastAPI application called Pantry, backed by a SQLite database
(use `sqlite-utils`). Implement ALL of the following — every route, column,
status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Recipes (`/recipes`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Pantry".
- `GET /recipes` lists every row (title, source), ordered by id, and renders an
  add form.

## Create (exact redirect)
- `POST /recipes` reads form fields `title`, `source`, inserts a new row, and
  redirects to `GET /recipes` using status code 303.

## Favorite and Unfavorite (both endpoints)
- `POST /recipes/{recipe_id}/favorite` sets `favorited` to 1 and redirects to `/recipes`
  with status 303.
- `POST /recipes/{recipe_id}/unfavorite` sets `favorited` to 0 and redirects to `/recipes`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_servings` — add a `servings` integer column defaulting to 2.
- `004_index_favorited` — create an index named `idx_recipes_favorited` on `recipes(favorited)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `favorited`,
  `unfavorited`, all integers, where `total == favorited + unfavorited`.
