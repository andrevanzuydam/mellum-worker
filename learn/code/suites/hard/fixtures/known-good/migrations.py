from sqlite_utils import Migrations

migrations = Migrations("agentclinic")


@migrations()
def add_tickets_status_archived_index(db):
    db.conn.execute(
        "create index if not exists idx_tickets_status_archived "
        "on tickets(status, archived_at)"
    )


@migrations()
def backfill_resolved_at(db):
    db.conn.execute("alter table tickets add column resolved_at text")
    db.conn.execute(
        "update tickets set resolved_at = ? where status = 'resolved'",
        ("2026-01-03T00:00:00",),
    )


@migrations()
def create_open_tickets_view(db):
    db.conn.execute(
        "create view if not exists open_tickets as "
        "select * from tickets where status = 'open' and archived_at is null"
    )


@migrations()
def add_tickets_note(db):
    db.conn.execute("alter table tickets add column note text")
