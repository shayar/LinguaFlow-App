from __future__ import annotations

import os
from typing import Any

import httpx

TATOEBA_API_BASE_URL = os.getenv("TATOEBA_API_BASE_URL", "https://api.tatoeba.org")
TATOEBA_TIMEOUT_SECONDS = float(os.getenv("TATOEBA_TIMEOUT_SECONDS", "30"))


def map_language_to_tatoeba_code(language: str) -> str:
    normalized = language.strip().lower()

    mapping = {
        "english": "eng",
        "spanish": "spa",
        "french": "fra",
        "german": "deu",
        "italian": "ita",
        "portuguese": "por",
        "nepali": "nep",
        "hindi": "hin",
        "japanese": "jpn",
        "korean": "kor",
    }

    return mapping.get(normalized, "eng")


def extract_sentence_items(payload: Any) -> list[dict]:
    rows: list[dict] = []

    if isinstance(payload, dict):
        if isinstance(payload.get("data"), list):
            rows = payload["data"]
        elif isinstance(payload.get("results"), list):
            rows = payload["results"]
        elif isinstance(payload.get("sentences"), list):
            rows = payload["sentences"]
    elif isinstance(payload, list):
        rows = payload

    items: list[dict] = []

    for row in rows:
        sentence_id = row.get("id")
        text = row.get("text") or row.get("sentence")
        lang = row.get("lang") or row.get("language")

        translations = row.get("translations") or []
        flattened_translations: list[dict] = []

        if isinstance(translations, list):
            for group in translations:
                if isinstance(group, list):
                    for item in group:
                        if isinstance(item, dict):
                            flattened_translations.append(item)
                elif isinstance(group, dict):
                    flattened_translations.append(group)

        if text:
            items.append(
                {
                    "id": sentence_id,
                    "text": text,
                    "language": lang,
                    "translations": flattened_translations,
                    "source": "tatoeba",
                    "license_label": "CC-BY 2.0 FR",
                }
            )

    return items


async def search_tatoeba_sentences(
    query: str,
    from_language: str,
    to_language: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> dict:
    from_code = map_language_to_tatoeba_code(from_language)
    to_code = map_language_to_tatoeba_code(to_language) if to_language else None

    candidates = [
        {
            "url": f"{TATOEBA_API_BASE_URL}/unstable/sentences",
            "params": {
                "query": query,
                "from": from_code,
                "to": to_code,
                "page": page,
                "perPage": page_size,
            },
        },
        {
            "url": f"{TATOEBA_API_BASE_URL}/unstable/sentences",
            "params": {
                "query": query,
                "from": from_code,
                "page": page,
                "perPage": page_size,
            },
        },
    ]

    last_error: Exception | None = None

    async with httpx.AsyncClient(timeout=TATOEBA_TIMEOUT_SECONDS) as client:
        for candidate in candidates:
            try:
                response = await client.get(
                    candidate["url"],
                    params={k: v for k, v in candidate["params"].items() if v is not None and v != ""},
                    headers={
                        "Accept": "application/json",
                        "User-Agent": "LinguaFlowAI/0.1",
                    },
                )
                response.raise_for_status()
                payload = response.json()
                items = extract_sentence_items(payload)

                return {
                    "query": query,
                    "from_language": from_language,
                    "to_language": to_language,
                    "provider": "tatoeba",
                    "items": items,
                }
            except Exception as error:
                last_error = error

    raise RuntimeError(f"Tatoeba search failed: {last_error}")