import os

import sqlite_utils

DB_PATH = os.environ.get("STACKS_DB", "stacks.db")

SEED = [{'title': 'Dune', 'author': 'Herbert', 'shelved': 1}, {'title': 'Snow Crash', 'author': 'Stephenson', 'shelved': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "books" not in db.table_names():
        db["books"].create({"id": int, "title": str, "author": str, "shelved": int}, pk="id")
    if db["books"].count == 0:
        for row in SEED:
            db["books"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["books"].rows_where(order_by="id"))


def add_row(db, title, author) -> int:
    return db["books"].insert({"title": title, "author": author, "shelved": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["books"].update(row_id, {"shelved": 1 if on else 0})


def summary(db) -> dict:
    total = db["books"].count
    on = db["books"].count_where("shelved = 1")
    return {"total": int(total), "shelved": int(on), "unshelved": int(total - on)}
