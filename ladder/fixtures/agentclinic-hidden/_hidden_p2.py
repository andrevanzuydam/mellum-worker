from starlette.testclient import TestClient

from app import app

client = TestClient(app)


def test_board_lists_seeded_complaint():
    response = client.get("/complaints")
    assert response.status_code == 200
    assert "Scope creep never ends." in response.text


def test_home_still_works():
    assert client.get("/").status_code == 200
