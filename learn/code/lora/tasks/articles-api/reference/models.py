import os

import sqlite_utils

DB_PATH = os.environ.get("READER_DB", "reader.db")

SEED = [{'title': 'On Bullshit', 'url': 'https://example.com/a', 'saved': 1}, {'title': 'The Bitter Lesson', 'url': 'https://example.com/b', 'saved': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "articles" not in db.table_names():
        db["articles"].create({"id": int, "title": str, "url": str, "saved": int}, pk="id")
    if db["articles"].count == 0:
        for row in SEED:
            db["articles"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["articles"].rows_where(order_by="id"))


def add_row(db, title, url) -> int:
    return db["articles"].insert({"title": title, "url": url, "saved": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["articles"].update(row_id, {"saved": 1 if on else 0})


def summary(db) -> dict:
    total = db["articles"].count
    on = db["articles"].count_where("saved = 1")
    return {"total": int(total), "saved": int(on), "unsaved": int(total - on)}
