"""Per-requirement checker for the Snipbox golden task (generated)."""
import os
import sys
import tempfile
from pathlib import Path

REF = Path(__file__).parent / "reference"
sys.path.insert(0, str(REF))

_DB = tempfile.mktemp(suffix=".db")
os.environ["SNIPBOX_DB"] = _DB

import sqlite_utils  # noqa: E402
from starlette.testclient import TestClient  # noqa: E402

import app as appmod  # noqa: E402
import migrations  # noqa: E402
import models  # noqa: E402

models.init_db(models.get_db())
migrations.run_migrations(models.get_db())
client = TestClient(appmod.app)


def _db():
    return sqlite_utils.Database(_DB)


def _fresh():
    db = sqlite_utils.Database(tempfile.mktemp(suffix=".db"))
    models.init_db(db)
    migrations.run_migrations(db)
    return db


def test_home_ok_and_names_app():
    r = client.get("/")
    assert r.status_code == 200
    assert "Snipbox" in r.text


def test_listing_shows_seed():
    r = client.get("/snippets")
    assert r.status_code == 200
    assert "Debounce" in r.text


def test_create_redirects_303_and_appears():
    r = client.post("/snippets", data={'title': 'Clamp', 'body': 'max(lo, min(x, hi))'}, follow_redirects=False)
    assert r.status_code == 303
    assert r.headers["location"] == "/snippets"
    assert "Clamp" in client.get("/snippets").text


def test_flag_on_redirects_303():
    r = client.post("/snippets/2/pin", follow_redirects=False)
    assert r.status_code == 303
    assert _db()["snippets"].get(2)["pinned"] == 1


def test_flag_off_redirects_303():
    client.post("/snippets/2/pin", follow_redirects=False)
    r = client.post("/snippets/2/unpin", follow_redirects=False)
    assert r.status_code == 303
    assert _db()["snippets"].get(2)["pinned"] == 0


def test_migration_index_exists():
    names = {i.name for i in _fresh()["snippets"].indexes}
    assert "idx_snippets_pinned" in names


def test_migration_extra_column_added():
    assert "language" in _fresh()["snippets"].columns_dict


def test_migration_created_at_backfilled():
    nulls = _fresh().execute(
        "select count(*) from snippets where created_at is null"
    ).fetchone()[0]
    assert nulls == 0


def test_migrations_are_recorded():
    names = {r["name"] for r in _fresh()["_migrations"].rows}
    assert names == {"001_add_created_at", "002_backfill_created_at", "003_add_language", "004_index_pinned"}


def test_rerunning_migrations_is_a_noop():
    db = _fresh()
    cols_before = len(db["snippets"].columns_dict)
    mig_before = db["_migrations"].count
    migrations.run_migrations(db)
    migrations.run_migrations(db)
    assert len(db["snippets"].columns_dict) == cols_before
    assert db["_migrations"].count == mig_before


def test_summary_exact_shape_and_sums():
    s = client.get("/summary").json()
    assert set(s.keys()) == {"total", "pinned", "unpinned"}
    assert all(isinstance(v, int) for v in s.values())
    assert s["total"] == s["pinned"] + s["unpinned"]
