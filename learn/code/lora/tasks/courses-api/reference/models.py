import os

import sqlite_utils

DB_PATH = os.environ.get("CAMPUS_DB", "campus.db")

SEED = [{'title': 'Linear Algebra', 'teacher': 'Strang', 'enrolled': 1}, {'title': 'Databases', 'teacher': 'Widom', 'enrolled': 0}]


def get_db(path: str | None = None) -> "sqlite_utils.Database":
    return sqlite_utils.Database(path or DB_PATH)


def init_db(db) -> None:
    if "courses" not in db.table_names():
        db["courses"].create({"id": int, "title": str, "teacher": str, "enrolled": int}, pk="id")
    if db["courses"].count == 0:
        for row in SEED:
            db["courses"].insert(row)


def list_rows(db) -> list[dict]:
    return list(db["courses"].rows_where(order_by="id"))


def add_row(db, title, teacher) -> int:
    return db["courses"].insert({"title": title, "teacher": teacher, "enrolled": 0}).last_pk


def set_flag(db, row_id: int, on: bool) -> None:
    db["courses"].update(row_id, {"enrolled": 1 if on else 0})


def summary(db) -> dict:
    total = db["courses"].count
    on = db["courses"].count_where("enrolled = 1")
    return {"total": int(total), "enrolled": int(on), "unenrolled": int(total - on)}
