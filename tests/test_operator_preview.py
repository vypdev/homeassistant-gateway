import pytest

from homeassistant_gateway.application.operator_preview import build_operator_preview


def test_operator_preview_returns_diff_without_execution() -> None:
    preview = build_operator_preview(
        "ha.call_service",
        "light.kitchen",
        "ha.write.services",
        {"state": "on"},
        {"state": "off", "brightness": 120},
    )

    assert preview.decision == "approval_required"
    assert preview.execution == "disabled"
    assert preview.before == {"state": "off", "brightness": 120}
    assert preview.after == {"state": "on", "brightness": 120}


def test_operator_preview_rejects_unbounded_payload() -> None:
    with pytest.raises(ValueError, match="operator_preview_invalid_proposed_state"):
        build_operator_preview("write", "target", "capability", {str(index): index for index in range(51)})
