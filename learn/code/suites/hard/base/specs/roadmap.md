# AgentClinic roadmap

Phases 1–4 are in place: home, board, add, resolve/reopen. The next requests
build the archive, the database report and the large-file sum, with schema
migrations in between. Each request is one step; run the tests after each.

1. Phase 5 — Archive & Audit
2. Migration — index the tickets table
3. Migration — add and backfill `resolved_at`
4. Phase 6 — Reporting over the database
5. Migration — an `open_tickets` view
6. Phase 7 — Sum the large file
7. Migration — a `note` column
8. Migration — a `schema_version` table
