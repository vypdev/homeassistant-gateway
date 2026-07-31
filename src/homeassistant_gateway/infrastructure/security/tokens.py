import hashlib
import hmac
import secrets


class SecureTokenIssuer:
    """Generate high-entropy bearer tokens and verify only their digests."""

    _prefix = "hgw_"

    def issue(self) -> tuple[str, str]:
        token = self._prefix + secrets.token_urlsafe(32)
        return token, self.digest(token)

    @staticmethod
    def digest(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def verify(self, token: str, expected_digest: str) -> bool:
        if not token.startswith(self._prefix):
            return False
        actual_digest = self.digest(token)
        return hmac.compare_digest(actual_digest, expected_digest)
