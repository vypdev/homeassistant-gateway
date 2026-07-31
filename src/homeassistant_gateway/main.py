import os
from pathlib import Path

import uvicorn

from homeassistant_gateway.composition import AppSettings, build_app


def load_settings() -> AppSettings:
    """Load process settings at the executable boundary, never during import."""
    operator_enabled = os.getenv("GATEWAY_OPERATOR_ENABLED", "false").lower() == "true"
    data_dir = Path(os.getenv("GATEWAY_DATA_DIR", "/data"))
    return AppSettings(data_dir=data_dir, operator_enabled=operator_enabled)


def main() -> None:
    settings = load_settings()
    uvicorn.run(
        build_app(settings),
        host=os.getenv("GATEWAY_HOST", "0.0.0.0"),
        port=int(os.getenv("GATEWAY_PORT", "8099")),
        access_log=False,
    )


if __name__ == "__main__":
    main()
