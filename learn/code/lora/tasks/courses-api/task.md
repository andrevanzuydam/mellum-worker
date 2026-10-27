# Campus — a course app

Build a small FastAPI application called Campus, backed by a SQLite database
(use `sqlite-utils`). Implement ALL of the following — every route, column,
status code, and migration.

## Pages and routes
- `app.py` with a FastAPI app instance.
- `templates/base.html` — a shared Jinja2 layout: HTML5 doctype,
  `<html lang="en">`, a title block defaulting to the app name, and a navbar
  linking Home (`/`) and Courses (`/courses`).
- `GET /` returns a home page that extends the layout and shows the app name
  "Campus".
- `GET /courses` lists every row (title, teacher), ordered by id, and renders an
  add form.

## Create (exact redirect)
- `POST /courses` reads form fields `title`, `teacher`, inserts a new row, and
  redirects to `GET /courses` using status code 303.

## Enroll and Unenroll (both endpoints)
- `POST /courses/{course_id}/enroll` sets `enrolled` to 1 and redirects to `/courses`
  with status 303.
- `POST /courses/{course_id}/unenroll` sets `enrolled` to 0 and redirects to `/courses`
  with status 303.

## Migrations (write, apply, record, idempotent)
Put migrations in `migrations.py` and apply them at startup. Track applied
migrations in a `_migrations` table so re-running is a no-op.
- `001_add_created_at` — add a `created_at` text column.
- `002_backfill_created_at` — set `created_at` to `2026-01-01T00:00:00`
  wherever it is null.
- `003_add_credits` — add a `credits` integer column defaulting to 3.
- `004_index_enrolled` — create an index named `idx_courses_enrolled` on `courses(enrolled)`.
Running the migrations twice must not error, duplicate a column, or re-record a
migration.

## Summary API (exact JSON)
- `GET /summary` returns JSON with exactly the keys `total`, `enrolled`,
  `unenrolled`, all integers, where `total == enrolled + unenrolled`.
