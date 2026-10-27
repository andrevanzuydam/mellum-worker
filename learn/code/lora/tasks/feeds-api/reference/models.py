import os

import sqlite_utils

DB_PATH = os.environ.get("RIVERRUN_DB", "riverrun.db")

SEED = [{'title': 'Daring Fireball', 'url': 'https://example.com/df', 'subscribed': 1}, {'title': 'Simon Willison', 'url': 'https://example.com/sw', 'subscribed': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "feeds" not in db.table_names():
        db["feeds"].create({"id": int, "title": str, "url": str, "subscribed": int}, pk="id")
    if db["feeds"].count == 0:
        for row in SEED:
            db["feeds"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["feeds"].rows_where(order_by="id"))


def add_row(db, title, url) -> int:
    return db["feeds"].insert({"title": title, "url": url, "subscribed": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["feeds"].update(row_id, {"subscribed": 1 if on else 0})


def summary(db) -> dict:
    total = db["feeds"].count
    on = db["feeds"].count_where("subscribed = 1")
    return {"total": int(total), "subscribed": int(on), "unsubscribed": int(total - on)}
