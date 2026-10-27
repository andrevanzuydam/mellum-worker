import os

import sqlite_utils

DB_PATH = os.environ.get("SLOTS_DB", "slots.db")

SEED = [{'who': 'Dana', 'when_at': '2026-02-01T10:00', 'confirmed': 1}, {'who': 'Rae', 'when_at': '2026-02-01T11:00', 'confirmed': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "bookings" not in db.table_names():
        db["bookings"].create({"id": int, "who": str, "when_at": str, "confirmed": int}, pk="id")
    if db["bookings"].count == 0:
        for row in SEED:
            db["bookings"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["bookings"].rows_where(order_by="id"))


def add_row(db, who, when_at) -> int:
    return db["bookings"].insert({"who": who, "when_at": when_at, "confirmed": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["bookings"].update(row_id, {"confirmed": 1 if on else 0})


def summary(db) -> dict:
    total = db["bookings"].count
    on = db["bookings"].count_where("confirmed = 1")
    return {"total": int(total), "confirmed": int(on), "unconfirmed": int(total - on)}
