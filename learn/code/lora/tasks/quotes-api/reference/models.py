import os

import sqlite_utils

DB_PATH = os.environ.get("COMMONPLACE_DB", "commonplace.db")

SEED = [{'body': 'Less is more', 'author': 'Mies', 'loved': 1}, {'body': 'Make it work', 'author': 'Kent', 'loved': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "quotes" not in db.table_names():
        db["quotes"].create({"id": int, "body": str, "author": str, "loved": int}, pk="id")
    if db["quotes"].count == 0:
        for row in SEED:
            db["quotes"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["quotes"].rows_where(order_by="id"))


def add_row(db, body, author) -> int:
    return db["quotes"].insert({"body": body, "author": author, "loved": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["quotes"].update(row_id, {"loved": 1 if on else 0})


def summary(db) -> dict:
    total = db["quotes"].count
    on = db["quotes"].count_where("loved = 1")
    return {"total": int(total), "loved": int(on), "unloved": int(total - on)}
