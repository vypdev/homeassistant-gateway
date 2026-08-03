from __future__ import annotations

import pytest

from scripts import live_smoke


@pytest.mark.live
def test_live_smoke_is_explicitly_skipped_without_live_url(monkeypatch, capsys) -> None:
    monkeypatch.delenv("GATEWAY_LIVE_URL", raising=False)

    assert live_smoke.run() == 0
    assert "SKIP: GATEWAY_LIVE_URL is not configured" in capsys.readouterr().out
