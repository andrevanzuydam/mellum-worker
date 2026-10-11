import json

from ladder.omlx_profiles import PROFILES
from ladder.pi_profile import REPO_ROOT

# A server default the ladder never sets, so its baseline profile has no value for it.
SERVER_DEFAULTS = ("turboquant_kv_enabled",)


def test_shipped_server_only_settings_equal_the_measured_baseline():
    data = json.loads((REPO_ROOT / "templates" / "omlx-model-settings.json").read_text())
    shipped = {k: v for k, v in data["model"]["serverOnly"].items() if k not in SERVER_DEFAULTS}
    assert "max_context_window" in shipped
    assert shipped == {k: PROFILES["baseline"][k] for k in shipped}
