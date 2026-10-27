import os

import sqlite_utils

DB_PATH = os.environ.get("CRATE_DB", "crate.db")

SEED = [{'title': 'Strobe', 'artist': 'Deadmau5', 'liked': 1}, {'title': 'Teardrop', 'artist': 'Massive Attack', 'liked': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "tracks" not in db.table_names():
        db["tracks"].create({"id": int, "title": str, "artist": str, "liked": int}, pk="id")
    if db["tracks"].count == 0:
        for row in SEED:
            db["tracks"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["tracks"].rows_where(order_by="id"))


def add_row(db, title, artist) -> int:
    return db["tracks"].insert({"title": title, "artist": artist, "liked": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["tracks"].update(row_id, {"liked": 1 if on else 0})


def summary(db) -> dict:
    total = db["tracks"].count
    on = db["tracks"].count_where("liked = 1")
    return {"total": int(total), "liked": int(on), "unliked": int(total - on)}
