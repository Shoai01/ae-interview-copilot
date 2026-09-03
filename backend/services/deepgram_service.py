import os

import requests

DEEPGRAM_GRANT_URL = "https://api.deepgram.com/v1/auth/grant"
# The token only needs to survive the WebSocket handshake — once the
# connection is open it stays open regardless of the token's expiry.
GRANT_TTL_SECONDS = 60


class DeepgramConfigError(RuntimeError):
    """Raised when the server has no permanent Deepgram API key configured."""


class DeepgramRequestError(RuntimeError):
    """Raised when Deepgram's grant endpoint could not be reached or errored."""


def mint_temporary_token() -> dict:
    """
    Exchange the server-side permanent Deepgram API key for a short-lived
    JWT scoped to usage:write, safe to hand to a browser client. The
    permanent key itself never leaves the backend.
    """
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    if not api_key:
        raise DeepgramConfigError("DEEPGRAM_API_KEY is not configured on the server.")

    try:
        response = requests.post(
            DEEPGRAM_GRANT_URL,
            headers={"Authorization": f"Token {api_key}"},
            json={"ttl_seconds": GRANT_TTL_SECONDS},
            timeout=10,
        )
        response.raise_for_status()
    except requests.RequestException as e:
        raise DeepgramRequestError(str(e)) from e

    return response.json()
