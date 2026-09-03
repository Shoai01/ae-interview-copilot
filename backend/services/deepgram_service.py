import logging
import os

import requests

logger = logging.getLogger(__name__)

DEEPGRAM_GRANT_URL = "https://api.deepgram.com/v1/auth/grant"
DEEPGRAM_SPEAK_URL = "https://api.deepgram.com/v1/speak"
# The token only needs to survive the WebSocket handshake — once the
# connection is open it stays open regardless of the token's expiry.
GRANT_TTL_SECONDS = 60
DEFAULT_TTS_MODEL = "aura-2-thalia-en"
# Interview questions are short; this just guards against an unbounded
# request (cost/latency) if something upstream ever passes bad input.
TTS_MAX_CHARS = 2000


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
        body = getattr(e.response, "text", None)
        logger.error("Deepgram grant request failed: %s | response body: %s", e, body)
        raise DeepgramRequestError(str(e)) from e

    return response.json()


def synthesize_speech(text: str, model: str = DEFAULT_TTS_MODEL) -> tuple[bytes, str]:
    """
    Convert `text` to speech via Deepgram's TTS (Aura) REST API.

    Unlike STT, this is a synchronous server-side proxy call made with the
    permanent API key directly — the browser never talks to Deepgram for TTS,
    so there's no need to mint a short-lived token for it.

    Returns (audio_bytes, content_type). Raises DeepgramConfigError if no key
    is configured, DeepgramRequestError if the call fails, or ValueError if
    `text` is empty.
    """
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    if not api_key:
        raise DeepgramConfigError("DEEPGRAM_API_KEY is not configured on the server.")

    text = (text or "").strip()
    if not text:
        raise ValueError("No text provided to synthesize.")
    if len(text) > TTS_MAX_CHARS:
        text = text[:TTS_MAX_CHARS]

    try:
        response = requests.post(
            DEEPGRAM_SPEAK_URL,
            params={"model": model, "encoding": "mp3"},
            headers={
                "Authorization": f"Token {api_key}",
                "Content-Type": "application/json",
            },
            json={"text": text},
            timeout=20,
        )
        response.raise_for_status()
    except requests.RequestException as e:
        body = getattr(e.response, "text", None)
        logger.error("Deepgram TTS request failed: %s | response body: %s", e, body)
        raise DeepgramRequestError(str(e)) from e

    content_type = response.headers.get("Content-Type", "audio/mpeg")
    return response.content, content_type
