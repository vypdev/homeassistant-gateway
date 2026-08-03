from __future__ import annotations

import pytest

from scripts import artifact_smoke


@pytest.mark.integration
def test_artifact_smoke_is_explicitly_skipped_without_image(monkeypatch, capsys) -> None:
    monkeypatch.delenv("GATEWAY_ARTIFACT_IMAGE", raising=False)

    assert artifact_smoke.main() == 0
    assert "SKIP: GATEWAY_ARTIFACT_IMAGE is not configured" in capsys.readouterr().out
