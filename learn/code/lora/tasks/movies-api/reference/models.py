import os

import sqlite_utils

DB_PATH = os.environ.get("REEL_DB", "reel.db")

SEED = [{'title': 'Arrival', 'director': 'Villeneuve', 'watched': 1}, {'title': 'Coherence', 'director': 'Byrkit', 'watched': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "movies" not in db.table_names():
        db["movies"].create({"id": int, "title": str, "director": str, "watched": int}, pk="id")
    if db["movies"].count == 0:
        for row in SEED:
            db["movies"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["movies"].rows_where(order_by="id"))


def add_row(db, title, director) -> int:
    return db["movies"].insert({"title": title, "director": director, "watched": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["movies"].update(row_id, {"watched": 1 if on else 0})


def summary(db) -> dict:
    total = db["movies"].count
    on = db["movies"].count_where("watched = 1")
    return {"total": int(total), "watched": int(on), "unwatched": int(total - on)}
