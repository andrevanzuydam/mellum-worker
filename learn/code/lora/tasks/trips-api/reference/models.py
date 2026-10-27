import os

import sqlite_utils

DB_PATH = os.environ.get("WANDER_DB", "wander.db")

SEED = [{'place': 'Lisbon', 'when_at': '2026-05-01', 'booked': 1}, {'place': 'Kyoto', 'when_at': '2026-09-10', 'booked': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "trips" not in db.table_names():
        db["trips"].create({"id": int, "place": str, "when_at": str, "booked": int}, pk="id")
    if db["trips"].count == 0:
        for row in SEED:
            db["trips"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["trips"].rows_where(order_by="id"))


def add_row(db, place, when_at) -> int:
    return db["trips"].insert({"place": place, "when_at": when_at, "booked": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["trips"].update(row_id, {"booked": 1 if on else 0})


def summary(db) -> dict:
    total = db["trips"].count
    on = db["trips"].count_where("booked = 1")
    return {"total": int(total), "booked": int(on), "unbooked": int(total - on)}
