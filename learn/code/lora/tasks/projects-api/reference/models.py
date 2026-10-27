import os

import sqlite_utils

DB_PATH = os.environ.get("FOLIO_DB", "folio.db")

SEED = [{'name': 'Apollo', 'lead': 'Dee', 'starred': 1}, {'name': 'Zephyr', 'lead': 'Evan', 'starred': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "projects" not in db.table_names():
        db["projects"].create({"id": int, "name": str, "lead": str, "starred": int}, pk="id")
    if db["projects"].count == 0:
        for row in SEED:
            db["projects"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["projects"].rows_where(order_by="id"))


def add_row(db, name, lead) -> int:
    return db["projects"].insert({"name": name, "lead": lead, "starred": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["projects"].update(row_id, {"starred": 1 if on else 0})


def summary(db) -> dict:
    total = db["projects"].count
    on = db["projects"].count_where("starred = 1")
    return {"total": int(total), "starred": int(on), "unstarred": int(total - on)}
