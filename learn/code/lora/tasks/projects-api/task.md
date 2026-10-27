# Folio — a project app

Build a small FastAPI application called Folio, backed by a SQLite database
(use `sqlite-utils`). Implement ALL of the following — every route, column,
status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Projects (`/projects`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Folio".
- `GET /projects` lists every row (name, lead), ordered by id, and renders an
  add form.

## Create (exact redirect)
- `POST /projects` reads form fields `name`, `lead`, inserts a new row, and
  redirects to `GET /projects` using status code 303.

## Star and Unstar (both endpoints)
- `POST /projects/{project_id}/star` sets `starred` to 1 and redirects to `/projects`
  with status 303.
- `POST /projects/{project_id}/unstar` sets `starred` to 0 and redirects to `/projects`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_budget` — add a `budget` integer column defaulting to 0.
- `004_index_starred` — create an index named `idx_projects_starred` on `projects(starred)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `starred`,
  `unstarred`, all integers, where `total == starred + unstarred`.
