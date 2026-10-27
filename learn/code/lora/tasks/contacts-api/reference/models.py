import os

import sqlite_utils

DB_PATH = os.environ.get("ROLODEX_DB", "rolodex.db")

SEED = [
    {"name": "Avery", "email": "avery@example.com", "starred": 1},
    {"name": "Blake", "email": "blake@example.com", "starred": 0},
]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "contacts" not in db.table_names():
        db["contacts"].create(
            {"id": int, "name": str, "email": str, "starred": int}, pk="id"
        )
    if db["contacts"].count == 0:
        for row in SEED:
            db["contacts"].insert(row)


def list_contacts(db) -> list[dict]:
    return list(db["contacts"].rows_where(order_by="id"))


def add_contact(db, name: str, email: str) -> int:
    return db["contacts"].insert(
        {"name": name, "email": email, "starred": 0}
    ).last_pk


def set_starred(db, contact_id: int, starred: bool) -> None:
    db["contacts"].update(contact_id, {"starred": 1 if starred else 0})


def summary(db) -> dict:
    total = db["contacts"].count
    starred = db["contacts"].count_where("starred = 1")
    return {"total": int(total), "starred": int(starred), "unstarred": int(total - starred)}
