from __future__ import annotations


def parse_bearer_token(header: str | None) -> str | None:
    """Return a single Bearer credential without normalizing or logging it."""
    if not header:
        return None
    scheme, separator, credentials = header.partition(" ")
    if scheme.lower() != "bearer" or not separator or not credentials:
        return None
    if credentials != credentials.strip() or " " in credentials:
        return None
    return credentials
