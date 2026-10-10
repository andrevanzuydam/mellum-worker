from starlette.testclient import TestClient

import models
from app import app

client = TestClient(app)


def ids():
    return [complaint.id for complaint in models.complaints]


def test_new_complaints_default_to_open_with_distinct_ids():
    first = models.Complaint("a", "b")
    second = models.Complaint("a", "c")
    assert first.status == "open"
    assert second.status == "open"
    assert first.id != second.id


def test_resolve_and_reopen_keep_the_order():
    complaint = models.complaints[0]
    before = ids()

    response = client.post(f"/complaints/{complaint.id}/resolve", follow_redirects=False)
    assert response.status_code == 303
    assert complaint.status == "resolved"
    assert "Resolved" in client.get("/complaints").text

    response = client.post(f"/complaints/{complaint.id}/reopen", follow_redirects=False)
    assert response.status_code == 303
    assert complaint.status == "open"

    assert ids() == before
