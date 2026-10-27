import os

import sqlite_utils

DB_PATH = os.environ.get("PANTRY_DB", "pantry.db")

SEED = [{'title': 'Dal tadka', 'source': 'Grandma', 'favorited': 1}, {'title': 'Pesto pasta', 'source': 'Blog', 'favorited': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "recipes" not in db.table_names():
        db["recipes"].create({"id": int, "title": str, "source": str, "favorited": int}, pk="id")
    if db["recipes"].count == 0:
        for row in SEED:
            db["recipes"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["recipes"].rows_where(order_by="id"))


def add_row(db, title, source) -> int:
    return db["recipes"].insert({"title": title, "source": source, "favorited": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["recipes"].update(row_id, {"favorited": 1 if on else 0})


def summary(db) -> dict:
    total = db["recipes"].count
    on = db["recipes"].count_where("favorited = 1")
    return {"total": int(total), "favorited": int(on), "unfavorited": int(total - on)}
