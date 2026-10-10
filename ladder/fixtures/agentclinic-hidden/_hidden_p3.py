from starlette.testclient import TestClient

from app import app

client = TestClient(app)


def test_post_redirects_and_lists_the_complaint():
    response = client.post(
        "/complaints",
        data={"agent_name": "hidden", "text": "hidden-check-123"},
        follow_redirects=False,
    )
    assert response.status_code == 303
    assert response.headers["location"] == "/complaints"
    assert "hidden-check-123" in client.get("/complaints").text
