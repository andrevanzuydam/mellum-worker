import os

import sqlite_utils

DB_PATH = os.environ.get("STOCKROOM_DB", "stockroom.db")

SEED = [{'name': 'Widget', 'sku': 'W-001', 'quantity': 12, 'flagged': 1}, {'name': 'Gadget', 'sku': 'G-014', 'quantity': 3, 'flagged': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "items" not in db.table_names():
        db["items"].create({"id": int, "name": str, "sku": str, "quantity": int, "flagged": int}, pk="id")
    if db["items"].count == 0:
        for row in SEED:
            db["items"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["items"].rows_where(order_by="id"))


def add_row(db, name, sku, quantity) -> int:
    return db["items"].insert({"name": name, "sku": sku, "quantity": quantity, "flagged": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["items"].update(row_id, {"flagged": 1 if on else 0})


def summary(db) -> dict:
    total = db["items"].count
    on = db["items"].count_where("flagged = 1")
    return {"total": int(total), "flagged": int(on), "unflagged": int(total - on)}
