import os

import sqlite_utils

DB_PATH = os.environ.get("TASKBIN_DB", "taskbin.db")

SEED = [{'title': 'Ship it', 'owner': 'Ana', 'starred': 1}, {'title': 'Write docs', 'owner': 'Bo', 'starred': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "tasks" not in db.table_names():
        db["tasks"].create({"id": int, "title": str, "owner": str, "starred": int}, pk="id")
    if db["tasks"].count == 0:
        for row in SEED:
            db["tasks"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["tasks"].rows_where(order_by="id"))


def add_row(db, title, owner) -> int:
    return db["tasks"].insert({"title": title, "owner": owner, "starred": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["tasks"].update(row_id, {"starred": 1 if on else 0})


def summary(db) -> dict:
    total = db["tasks"].count
    on = db["tasks"].count_where("starred = 1")
    return {"total": int(total), "starred": int(on), "unstarred": int(total - on)}
