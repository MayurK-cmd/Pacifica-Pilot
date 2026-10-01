"""
Pacifica API base URLs with testnet/mainnet switching.

Per docs (REST API overview):
    Mainnet REST endpoint URL: https://api.pacifica.fi/api/v1
    Testnet REST endpoint URL: https://test-api.pacifica.fi/api/v1

All core modules must resolve their host through `get_base_url()` so that
`/mode mainnet` actually changes where requests go. Never hardcode a host.
"""

from typing import Optional

PACIFICA_TESTNET_URL = "https://test-api.pacifica.fi/api/v1"
PACIFICA_MAINNET_URL = "https://api.pacifica.fi/api/v1"


def get_base_url(mode: Optional[str] = None) -> str:
    """
    Return the Pacifica REST base URL for the given mode.

    Args:
        mode: "testnet" | "mainnet". When None, read from local config.json
              (falls back to testnet if config is missing/unreadable).

    Returns:
        Base URL string with no trailing slash.
    """
    if mode is None:
        try:
            # Local import to avoid any import-cycle risk at module load.
            from ..storage import load_config

            mode = load_config().get("mode", "testnet")
        except Exception:
            mode = "testnet"

    if mode == "mainnet":
        return PACIFICA_MAINNET_URL
    return PACIFICA_TESTNET_URL
