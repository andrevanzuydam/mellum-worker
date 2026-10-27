import os

import sqlite_utils

DB_PATH = os.environ.get("HUB_DB", "hub.db")

SEED = [{'name': 'Lamp', 'kind': 'light', 'paired': 1}, {'name': 'Thermostat', 'kind': 'climate', 'paired': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "devices" not in db.table_names():
        db["devices"].create({"id": int, "name": str, "kind": str, "paired": int}, pk="id")
    if db["devices"].count == 0:
        for row in SEED:
            db["devices"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["devices"].rows_where(order_by="id"))


def add_row(db, name, kind) -> int:
    return db["devices"].insert({"name": name, "kind": kind, "paired": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["devices"].update(row_id, {"paired": 1 if on else 0})


def summary(db) -> dict:
    total = db["devices"].count
    on = db["devices"].count_where("paired = 1")
    return {"total": int(total), "paired": int(on), "unpaired": int(total - on)}
