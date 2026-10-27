"""Per-requirement checker for the Rolodex golden task."""
import os
import sys
import tempfile
from pathlib import Path

REF = Path(__file__).parent / "reference"
sys.path.insert(0, str(REF))

_DB = tempfile.mktemp(suffix=".db")
os.environ["ROLODEX_DB"] = _DB

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
    assert "Rolodex" in r.text


def test_contacts_lists_seed():
    r = client.get("/contacts")
    assert r.status_code == 200
    assert "Avery" in r.text


def test_create_redirects_303_and_appears():
    r = client.post(
        "/contacts",
        data={"name": "Casey", "email": "casey@example.com"},
        follow_redirects=False,
    )
    assert r.status_code == 303
    assert r.headers["location"] == "/contacts"
    assert "Casey" in client.get("/contacts").text


def test_star_redirects_303_and_stars():
    r = client.post("/contacts/2/star", follow_redirects=False)
    assert r.status_code == 303
    assert _db()["contacts"].get(2)["starred"] == 1


def test_unstar_redirects_303_and_unstars():
    client.post("/contacts/2/star", follow_redirects=False)
    r = client.post("/contacts/2/unstar", follow_redirects=False)
    assert r.status_code == 303
    assert _db()["contacts"].get(2)["starred"] == 0


def test_migration_index_exists():
    names = {i.name for i in _fresh()["contacts"].indexes}
    assert "idx_contacts_starred" in names


def test_migration_phone_column_added():
    assert "phone" in _fresh()["contacts"].columns_dict


def test_migration_created_at_backfilled():
    nulls = _fresh().execute(
        "select count(*) from contacts where created_at is null"
    ).fetchone()[0]
    assert nulls == 0


def test_migrations_are_recorded():
    names = {r["name"] for r in _fresh()["_migrations"].rows}
    assert names == {
        "001_add_created_at",
        "002_backfill_created_at",
        "003_add_phone",
        "004_index_starred",
    }


def test_rerunning_migrations_is_a_noop():
    db = _fresh()
    cols_before = len(db["contacts"].columns_dict)
    mig_before = db["_migrations"].count
    migrations.run_migrations(db)
    migrations.run_migrations(db)
    assert len(db["contacts"].columns_dict) == cols_before
    assert db["_migrations"].count == mig_before


def test_summary_exact_shape_and_sums():
    s = client.get("/summary").json()
    assert set(s.keys()) == {"total", "starred", "unstarred"}
    assert all(isinstance(v, int) for v in s.values())
    assert s["total"] == s["starred"] + s["unstarred"]
