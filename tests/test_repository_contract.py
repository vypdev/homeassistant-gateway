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
    text = (ROOT / "docs" / "architecture.md").read_text()
    assert "Primary: Home Assistant App" in text
    assert "companion custom integration" in text


def test_app_does_not_map_the_raw_home_assistant_config_directory() -> None:
    text = (ROOT / "addon" / "config.yaml").read_text()
    assert "homeassistant_api: true" in text
    assert "- data:rw" in text
    assert "/config" not in text
    assert "secrets.yaml" not in text
    assert ".storage" not in text


def test_automation_mutation_is_explicitly_not_assumed() -> None:
    text = (ROOT / "docs" / "home-assistant-platform-contracts.md").read_text()
    assert "must not blindly rewrite YAML" in text
    assert "unsupported-operation" in text
