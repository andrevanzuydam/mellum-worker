import json
from pathlib import Path

PROFILE = Path(__file__).resolve().parents[1] / "profile" / "models.json"


def test_the_profile_pins_one_llamacpp_model():
    providers = json.loads(PROFILE.read_text())["providers"]
    assert list(providers) == ["llamacpp"]
    model = providers["llamacpp"]["models"][0]
    assert model["id"] == "Mellum2.1-12B-A2.5B-Thinking"
