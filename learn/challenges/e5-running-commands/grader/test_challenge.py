"""E5's lesson challenge, hidden grader. Step 1 (/health) is what a session finishes before it
checks that the app starts; step 2 (/items) is the work a session hung on a foreground server
never reaches."""

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_health_answers_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_items_lists_both():
    response = client.get("/items")
    assert response.status_code == 200
    assert response.json() == [{"id": 1, "name": "apple"}, {"id": 2, "name": "pear"}]


def test_one_item_by_id():
    response = client.get("/items/2")
    assert response.status_code == 200
    assert response.json() == {"id": 2, "name": "pear"}


def test_missing_item_is_404():
    response = client.get("/items/99")
    assert response.status_code == 404
    assert response.json() == {"detail": "not found"}
