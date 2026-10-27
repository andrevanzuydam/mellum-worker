import os

import sqlite_utils

DB_PATH = os.environ.get("ROLODEX_DB", "rolodex.db")

SEED = [{'name': 'Avery', 'email': 'avery@example.com', 'starred': 1}, {'name': 'Blake', 'email': 'blake@example.com', 'starred': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "contacts" not in db.table_names():
        db["contacts"].create({"id": int, "name": str, "email": str, "starred": int}, pk="id")
    if db["contacts"].count == 0:
        for row in SEED:
            db["contacts"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["contacts"].rows_where(order_by="id"))


def add_row(db, name, email) -> int:
    return db["contacts"].insert({"name": name, "email": email, "starred": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["contacts"].update(row_id, {"starred": 1 if on else 0})


def summary(db) -> dict:
    total = db["contacts"].count
    on = db["contacts"].count_where("starred = 1")
    return {"total": int(total), "starred": int(on), "unstarred": int(total - on)}
