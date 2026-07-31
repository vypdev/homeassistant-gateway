from pathlib import Path


ROOT = Path(__file__).parents[1]


def test_security_contract_exists() -> None:
    text = (ROOT / "docs" / "security-model.md").read_text()
    assert "Observer (default)" in text
    assert "Operator (explicit)" in text
    assert "No Docker socket" in text


def test_operator_is_not_enabled_by_default() -> None:
    text = (ROOT / "README.md").read_text()
    assert "No operator mutation is enabled yet" in text


def test_architecture_keeps_home_assistant_as_first_deployment_target() -> None:
    text = (ROOT / "docs" / "adr" / "0001-home-assistant-native.md").read_text()
    assert "Home Assistant-native custom integration" in text
    assert "optional add-on" in text
