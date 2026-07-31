from homeassistant_gateway.infrastructure.security.tokens import SecureTokenIssuer


def test_secure_token_issuer_returns_verifiable_one_time_value() -> None:
    issuer = SecureTokenIssuer()

    token, digest = issuer.issue()

    assert token.startswith("hgw_")
    assert len(token) >= 40
    assert digest != token
    assert issuer.verify(token, digest)
    assert not issuer.verify("hgw_invalid", digest)


def test_secure_token_issuer_does_not_repeat_values() -> None:
    issuer = SecureTokenIssuer()

    first, first_digest = issuer.issue()
    second, second_digest = issuer.issue()

    assert first != second
    assert first_digest != second_digest
