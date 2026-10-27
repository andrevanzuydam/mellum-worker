import os

import sqlite_utils

DB_PATH = os.environ.get("MARKPILE_DB", "markpile.db")

SEED = [
    {"title": "Python docs", "url": "https://docs.python.org/3/", "pinned": 1},
    {"title": "SQLite home", "url": "https://sqlite.org/", "pinned": 0},
]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "bookmarks" not in db.table_names():
        db["bookmarks"].create(
            {"id": int, "title": str, "url": str, "pinned": int}, pk="id"
        )
    if db["bookmarks"].count == 0:
        for row in SEED:
            db["bookmarks"].insert(row)


def list_bookmarks(db) -> list[dict]:
    return list(db["bookmarks"].rows_where(order_by="id"))


def add_bookmark(db, title: str, url: str) -> int:
    return db["bookmarks"].insert({"title": title, "url": url, "pinned": 0}).last_pk


def set_pinned(db, bookmark_id: int, pinned: bool) -> None:
    db["bookmarks"].update(bookmark_id, {"pinned": 1 if pinned else 0})


def summary(db) -> dict:
    total = db["bookmarks"].count
    pinned = db["bookmarks"].count_where("pinned = 1")
    return {"total": int(total), "pinned": int(pinned), "unpinned": int(total - pinned)}
