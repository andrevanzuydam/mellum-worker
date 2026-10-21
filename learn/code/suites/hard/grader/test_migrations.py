import sqlite3


def _schema():
    return sqlite3.connect("data.db")


def test_index_exists():
    con = _schema()
    try:
        names = {row[0] for row in con.execute(
            "select name from sqlite_master where type = 'index'")}
    finally:
        con.close()
    assert "idx_tickets_status_archived" in names


def test_resolved_at_is_backfilled():
    con = _schema()
    try:
        rows = list(con.execute(
            "select resolved_at from tickets where status = 'resolved'"))
    finally:
        con.close()
    assert rows and all(row[0] for row in rows)


def test_open_tickets_view():
    con = _schema()
    try:
        rows = list(con.execute("select id, status, archived_at from open_tickets"))
    finally:
        con.close()
    assert all(status == "open" and archived is None for _, status, archived in rows)


def test_note_column():
    con = _schema()
    try:
        columns = [row[1] for row in con.execute("pragma table_info(tickets)")]
    finally:
        con.close()
    assert "note" in columns


def test_schema_version():
    con = _schema()
    try:
        row = con.execute("select version from schema_version").fetchone()
    finally:
        con.close()
    assert row and row[0] >= 1
