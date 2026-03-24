from __future__ import annotations

import json
from typing import Any

LEVEL_TARGETS = {
    "beginner": {"easy": 8, "medium": 3, "hard": 1},
    "elementary": {"easy": 5, "medium": 5, "hard": 2},
    "intermediate": {"easy": 3, "medium": 5, "hard": 4},
    "advanced": {"easy": 2, "medium": 4, "hard": 6},
}

QUIZ_BANK = {
    "Spanish": {
        "easy": [
            {"targetWord": "hola", "translation": "hello"},
            {"targetWord": "gracias", "translation": "thank you"},
            {"targetWord": "agua", "translation": "water"},
            {"targetWord": "casa", "translation": "house"},
            {"targetWord": "comer", "translation": "to eat"},
            {"targetWord": "amigo", "translation": "friend"},
            {"targetWord": "libro", "translation": "book"},
            {"targetWord": "escuela", "translation": "school"},
        ],
        "medium": [
            {"targetWord": "caminar", "translation": "to walk"},
            {"targetWord": "pregunta", "translation": "question"},
            {"targetWord": "respuesta", "translation": "answer"},
            {"targetWord": "trabajo", "translation": "work"},
            {"targetWord": "mercado", "translation": "market"},
            {"targetWord": "desayuno", "translation": "breakfast"},
        ],
        "hard": [
            {"targetWord": "aunque", "translation": "although"},
            {"targetWord": "desarrollar", "translation": "to develop"},
            {"targetWord": "sugerencia", "translation": "suggestion"},
            {"targetWord": "aprendizaje", "translation": "learning"},
            {"targetWord": "sin embargo", "translation": "however"},
            {"targetWord": "aprovechar", "translation": "to take advantage of"},
        ],
    },
    "French": {
        "easy": [
            {"targetWord": "bonjour", "translation": "hello"},
            {"targetWord": "merci", "translation": "thank you"},
            {"targetWord": "eau", "translation": "water"},
            {"targetWord": "maison", "translation": "house"},
            {"targetWord": "manger", "translation": "to eat"},
            {"targetWord": "ami", "translation": "friend"},
            {"targetWord": "livre", "translation": "book"},
            {"targetWord": "école", "translation": "school"},
        ],
        "medium": [
            {"targetWord": "question", "translation": "question"},
            {"targetWord": "réponse", "translation": "answer"},
            {"targetWord": "travail", "translation": "work"},
            {"targetWord": "marché", "translation": "market"},
            {"targetWord": "petit-déjeuner", "translation": "breakfast"},
            {"targetWord": "marcher", "translation": "to walk"},
        ],
        "hard": [
            {"targetWord": "cependant", "translation": "however"},
            {"targetWord": "apprentissage", "translation": "learning"},
            {"targetWord": "développer", "translation": "to develop"},
            {"targetWord": "suggestion", "translation": "suggestion"},
            {"targetWord": "profond", "translation": "deep"},
            {"targetWord": "pourtant", "translation": "yet/however"},
        ],
    },
    "Nepali": {
        "easy": [
            {"targetWord": "नमस्ते", "translation": "hello"},
            {"targetWord": "धन्यवाद", "translation": "thank you"},
            {"targetWord": "पानी", "translation": "water"},
            {"targetWord": "घर", "translation": "house"},
            {"targetWord": "खानु", "translation": "to eat"},
            {"targetWord": "साथी", "translation": "friend"},
            {"targetWord": "किताब", "translation": "book"},
            {"targetWord": "विद्यालय", "translation": "school"},
        ],
        "medium": [
            {"targetWord": "प्रश्न", "translation": "question"},
            {"targetWord": "उत्तर", "translation": "answer"},
            {"targetWord": "काम", "translation": "work"},
            {"targetWord": "बजार", "translation": "market"},
            {"targetWord": "हिँड्नु", "translation": "to walk"},
            {"targetWord": "बिहानको खाना", "translation": "breakfast"},
        ],
        "hard": [
            {"targetWord": "यद्यपि", "translation": "although"},
            {"targetWord": "सुझाव", "translation": "suggestion"},
            {"targetWord": "विकास", "translation": "development"},
            {"targetWord": "अध्ययन", "translation": "study"},
            {"targetWord": "व्यवहार", "translation": "behavior"},
            {"targetWord": "प्रयोग", "translation": "use/application"},
        ],
    },
    "English": {
        "easy": [
            {"targetWord": "hello", "translation": "hello"},
            {"targetWord": "water", "translation": "water"},
            {"targetWord": "house", "translation": "house"},
            {"targetWord": "friend", "translation": "friend"},
            {"targetWord": "eat", "translation": "to eat"},
            {"targetWord": "book", "translation": "book"},
            {"targetWord": "school", "translation": "school"},
            {"targetWord": "thank you", "translation": "thank you"},
        ],
        "medium": [
            {"targetWord": "question", "translation": "question"},
            {"targetWord": "answer", "translation": "answer"},
            {"targetWord": "market", "translation": "market"},
            {"targetWord": "breakfast", "translation": "breakfast"},
            {"targetWord": "walk", "translation": "to walk"},
            {"targetWord": "work", "translation": "work"},
        ],
        "hard": [
            {"targetWord": "however", "translation": "however"},
            {"targetWord": "suggestion", "translation": "suggestion"},
            {"targetWord": "develop", "translation": "to develop"},
            {"targetWord": "learning", "translation": "learning"},
            {"targetWord": "advantage", "translation": "advantage"},
            {"targetWord": "although", "translation": "although"},
        ],
    },
}

def normalize_level(level: str | None) -> str:
    if not level:
        return "beginner"
    normalized = level.strip().lower()
    if normalized not in LEVEL_TARGETS:
        return "beginner"
    return normalized

def build_adaptive_quiz_from_bank(
    target_language: str,
    learner_level: str | None,
    quiz_size: int = 12,
) -> list[dict]:
    level = normalize_level(learner_level)
    distribution = LEVEL_TARGETS[level]

    bank = QUIZ_BANK.get(target_language, QUIZ_BANK["English"])

    items: list[dict] = []
    for bucket_name in ["easy", "medium", "hard"]:
        items.extend(bank.get(bucket_name, [])[: distribution[bucket_name]])

    return items[:quiz_size]

def build_placement_prompt(
    target_language: str,
    native_language: str | None,
    learner_level: str | None,
    quiz_size: int,
) -> str:
    level = normalize_level(learner_level)

    return f"""
Generate an adaptive placement quiz for a language learner.

Rules:
- Target language: {target_language}
- Learner native language: {native_language or "English"}
- Learner self-reported level: {level}
- Quiz size: {quiz_size}
- Return JSON only
- Mix easy, medium, and hard words based on learner level
- Include common nouns, verbs, and short phrases
- Avoid duplicates
- Output format:
{{
  "items": [
    {{
      "targetWord": "....",
      "translation": "....",
      "difficulty": "easy|medium|hard"
    }}
  ]
}}
""".strip()

def parse_quiz_items_from_text(text: str) -> list[dict]:
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found")

    payload = json.loads(text[start : end + 1])
    items = payload.get("items", [])
    if not isinstance(items, list):
        raise ValueError("items is not a list")

    cleaned: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        target_word = str(item.get("targetWord", "")).strip()
        translation = str(item.get("translation", "")).strip()
        difficulty = str(item.get("difficulty", "easy")).strip().lower()
        if target_word and translation:
            cleaned.append(
                {
                    "targetWord": target_word,
                    "translation": translation,
                    "difficulty": difficulty if difficulty in {"easy", "medium", "hard"} else "easy",
                }
            )

    return cleaned