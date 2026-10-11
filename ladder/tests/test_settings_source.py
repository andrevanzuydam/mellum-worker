import json

from ladder.omlx_profiles import PROFILES
from ladder.pi_profile import REPO_ROOT

SERVER_DEFAULTS = ("turboquant_kv_enabled", "enable_thinking")


def test_shipped_settings_equal_the_measured_baseline():
    data = json.loads((REPO_ROOT / "templates" / "omlx-model-settings.json").read_text())
    shipped = {k: v for k, v in data["model"].items() if k not in SERVER_DEFAULTS}
    assert shipped == PROFILES["baseline"]
