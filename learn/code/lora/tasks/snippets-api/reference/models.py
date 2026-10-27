import os

import sqlite_utils

DB_PATH = os.environ.get("SNIPBOX_DB", "snipbox.db")

SEED = [{'title': 'Debounce', 'body': 'const d = ...', 'pinned': 1}, {'title': 'Retry', 'body': 'def retry(): ...', 'pinned': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "snippets" not in db.table_names():
        db["snippets"].create({"id": int, "title": str, "body": str, "pinned": int}, pk="id")
    if db["snippets"].count == 0:
        for row in SEED:
            db["snippets"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["snippets"].rows_where(order_by="id"))


def add_row(db, title, body) -> int:
    return db["snippets"].insert({"title": title, "body": body, "pinned": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["snippets"].update(row_id, {"pinned": 1 if on else 0})


def summary(db) -> dict:
    total = db["snippets"].count
    on = db["snippets"].count_where("pinned = 1")
    return {"total": int(total), "pinned": int(on), "unpinned": int(total - on)}
