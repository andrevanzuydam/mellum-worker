import os

import sqlite_utils

DB_PATH = os.environ.get("SHOPFRONT_DB", "shopfront.db")

SEED = [{'name': 'Mug', 'sku': 'M-1', 'featured': 1}, {'name': 'Cap', 'sku': 'C-1', 'featured': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "products" not in db.table_names():
        db["products"].create({"id": int, "name": str, "sku": str, "featured": int}, pk="id")
    if db["products"].count == 0:
        for row in SEED:
            db["products"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["products"].rows_where(order_by="id"))


def add_row(db, name, sku) -> int:
    return db["products"].insert({"name": name, "sku": sku, "featured": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["products"].update(row_id, {"featured": 1 if on else 0})


def summary(db) -> dict:
    total = db["products"].count
    on = db["products"].count_where("featured = 1")
    return {"total": int(total), "featured": int(on), "unfeatured": int(total - on)}
