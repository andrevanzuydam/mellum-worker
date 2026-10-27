import os

import sqlite_utils

DB_PATH = os.environ.get("STREAKS_DB", "streaks.db")

SEED = [{'name': 'Stretch', 'cadence': 'daily', 'tracked': 1}, {'name': 'Journal', 'cadence': 'nightly', 'tracked': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "habits" not in db.table_names():
        db["habits"].create({"id": int, "name": str, "cadence": str, "tracked": int}, pk="id")
    if db["habits"].count == 0:
        for row in SEED:
            db["habits"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["habits"].rows_where(order_by="id"))


def add_row(db, name, cadence) -> int:
    return db["habits"].insert({"name": name, "cadence": cadence, "tracked": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["habits"].update(row_id, {"tracked": 1 if on else 0})


def summary(db) -> dict:
    total = db["habits"].count
    on = db["habits"].count_where("tracked = 1")
    return {"total": int(total), "tracked": int(on), "untracked": int(total - on)}
