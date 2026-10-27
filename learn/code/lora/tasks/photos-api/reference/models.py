import os

import sqlite_utils

DB_PATH = os.environ.get("GALLERY_DB", "gallery.db")

SEED = [{'title': 'Sunrise', 'url': 'https://example.com/1.jpg', 'favorited': 1}, {'title': 'Harbour', 'url': 'https://example.com/2.jpg', 'favorited': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "photos" not in db.table_names():
        db["photos"].create({"id": int, "title": str, "url": str, "favorited": int}, pk="id")
    if db["photos"].count == 0:
        for row in SEED:
            db["photos"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["photos"].rows_where(order_by="id"))


def add_row(db, title, url) -> int:
    return db["photos"].insert({"title": title, "url": url, "favorited": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["photos"].update(row_id, {"favorited": 1 if on else 0})


def summary(db) -> dict:
    total = db["photos"].count
    on = db["photos"].count_where("favorited = 1")
    return {"total": int(total), "favorited": int(on), "unfavorited": int(total - on)}
