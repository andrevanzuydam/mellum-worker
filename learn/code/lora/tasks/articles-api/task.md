# Reader — a reading app

Build a small FastAPI application called Reader, backed by a SQLite database
(use `sqlite-utils`). Implement ALL of the following — every route, column,
status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Articles (`/articles`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Reader".
- `GET /articles` lists every row (title, url), ordered by id, and renders an
  add form.

## Create (exact redirect)
- `POST /articles` reads form fields `title`, `url`, inserts a new row, and
  redirects to `GET /articles` using status code 303.

## Save and Unsave (both endpoints)
- `POST /articles/{article_id}/save` sets `saved` to 1 and redirects to `/articles`
  with status 303.
- `POST /articles/{article_id}/unsave` sets `saved` to 0 and redirects to `/articles`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_wordcount` — add a `wordcount` integer column defaulting to 0.
- `004_index_saved` — create an index named `idx_articles_saved` on `articles(saved)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `saved`,
  `unsaved`, all integers, where `total == saved + unsaved`.
