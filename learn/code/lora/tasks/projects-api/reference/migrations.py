"""Tracked, idempotent migrations for Folio."""
from __future__ import annotations

BACKFILL_DATE = "2026-01-01T00:00:00"


def _has_column(db, table: str, col: str) -> bool:
    return col in db[table].columns_dict


def _m_add_created_at(db) -> None:
    if not _has_column(db, "projects", "created_at"):
        db["projects"].add_column("created_at", str)


def _m_backfill_created_at(db) -> None:
    db.execute(
        "UPDATE projects SET created_at = ? WHERE created_at IS NULL", [BACKFILL_DATE]
    )
    db.conn.commit()


def _m_add_extra(db) -> None:
    if not _has_column(db, "projects", "budget"):
        db["projects"].add_column("budget", int)
        db.execute(
            "UPDATE projects SET budget = 0 WHERE budget IS NULL"
        )
        db.conn.commit()


def _m_index_flag(db) -> None:
    db["projects"].create_index(
        ["starred"], index_name="idx_projects_starred", if_not_exists=True
    )


MIGRATIONS = [
    ("001_add_created_at", _m_add_created_at),
    ("002_backfill_created_at", _m_backfill_created_at),
    ("003_add_budget", _m_add_extra),
    ("004_index_starred", _m_index_flag),
]


def _ensure_tracking(db) -> None:
    if "_migrations" not in db.table_names():
        db["_migrations"].create({"name": str, "applied_at": str}, pk="name")


def applied(db) -> set[str]:
    _ensure_tracking(db)
    return {r["name"] for r in db["_migrations"].rows}


def run_migrations(db) -> list[str]:
    _ensure_tracking(db)
    done = applied(db)
    for name, fn in MIGRATIONS:
        if name not in done:
            fn(db)
            db["_migrations"].insert({"name": name, "applied_at": BACKFILL_DATE})
            done.add(name)
    return sorted(done)
