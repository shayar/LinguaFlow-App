from __future__ import annotations
from tatoeba_adapter import search_tatoeba_sentences

import json
import os
import re
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from openai import OpenAI
from pydantic import BaseModel
from placement_quiz import build_adaptive_quiz_from_bank, build_placement_prompt, parse_quiz_items_from_text

try:
    from tracing import setup_tracing
except Exception:
    setup_tracing = None

load_dotenv()

app = FastAPI()

if setup_tracing:
    setup_tracing(app)

AI_PROVIDER = os.getenv("AI_PROVIDER", "mock").lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OLLAMA_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "180"))

openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


class ExampleRequest(BaseModel):
    target_word: str
    translation: str
    target_language: str
    learner_level: str | None = None
    native_language: str | None = None


class DeckGenerationRequest(BaseModel):
    source_text: str
    target_language: str
    learner_level: str | None = None
    native_language: str | None = None
    source_type: str | None = None


class RefineSentenceRequest(BaseModel):
    target_word: str
    translation: str
    target_language: str
    learner_level: str | None = None
    previous_sentence: str
    advanced_words: list[str] = []


class InitialQuizRequest(BaseModel):
    target_language: str
    native_language: str | None = None
    learner_level: str | None = None
    quiz_size: int | None = 5


class SentenceTranslationRequest(BaseModel):
    sentence: str
    target_language: str
    native_language: str | None = None

class TatoebaSearchRequest(BaseModel):
    query: str
    from_language: str
    to_language: str | None = None
    page: int | None = 1
    page_size: int | None = 10

SIMPLIFICATION_MAP = {
    "feline": "cat",
    "canine": "dog",
    "consumes": "eats",
    "enormous": "big",
    "massive": "big",
    "tiny": "small",
    "rapid": "fast",
    "quickly": "fast",
    "purchase": "buy",
    "reside": "live",
    "commence": "start",
    "terminate": "end",
    "infant": "baby",
    "assistance": "help",
    "obtain": "get",
    "utilize": "use",
    "approximately": "about",
    "numerous": "many",
    "individual": "person",
    "children": "kids",
    "consume": "eat",
    "beverage": "drink",
    "sofa": "couch",
}


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ai-service",
        "provider": AI_PROVIDER,
    }


def build_explanation(target_word: str, translation: str, learner_level: str) -> str:
    level = learner_level.lower()

    if level == "beginner":
        return (
            f"'{target_word}' means '{translation}'. "
            "This explanation is kept very short so you can focus on the main meaning."
        )

    if level == "elementary":
        return (
            f"'{target_word}' means '{translation}'. "
            "You should try to notice how it appears in a short everyday sentence."
        )

    if level == "intermediate":
        return (
            f"'{target_word}' means '{translation}'. "
            "Pay attention to how it fits into a more natural sentence and broader context."
        )

    if level == "advanced":
        return (
            f"'{target_word}' means '{translation}'. "
            "At this level, it helps to think about nuance, context, and alternate phrasing."
        )

    return f"'{target_word}' means '{translation}'."

def build_word_translation_prompt(
    word: str,
    target_language: str,
    native_language: str | None,
) -> str:
    return f"""
Translate this single word accurately.

Rules:
- Original word language: {target_language}
- Translate into: {native_language or "English"}
- Return JSON only
- Format:
{{
  "translation": "..."
}}

Word:
{word}
""".strip()

def build_native_translation(
    sentence: str,
    target_word: str,
    translation: str,
    native_language: str | None,
) -> str:
    native = (native_language or "English").lower()

    if native == "english" and target_word and translation:
        pattern = re.compile(rf"\b{re.escape(target_word)}\b", flags=re.IGNORECASE)
        return pattern.sub(translation, sentence)

    if translation:
        return f"{sentence} [{native_language or 'English'} meaning: {translation}]"

    return sentence


def build_gloss_items(sentence: str, target_word: str, translation: str):
    tokens = re.findall(r"[A-Za-zÀ-ÿ\u0900-\u097F']+|[.,!?;:¿¡]", sentence)
    glosses = []

    for token in tokens:
        if re.fullmatch(r"[.,!?;:¿¡]", token):
            glosses.append(
                {
                    "token": token,
                    "gloss": token,
                    "isTarget": False,
                }
            )
            continue

        is_target = token.lower() == target_word.lower()

        glosses.append(
            {
                "token": token,
                "gloss": translation if is_target else "",
                "isTarget": is_target,
            }
        )

    return glosses


def preserve_case(original: str, replacement: str) -> str:
    if original.isupper():
        return replacement.upper()
    if original[:1].isupper():
        return replacement.capitalize()
    return replacement


def simplify_sentence_rule_based(sentence: str, advanced_words: list[str]) -> tuple[str, list[dict]]:
    rewritten = sentence
    replacements_used = []

    for word in advanced_words:
        simpler = SIMPLIFICATION_MAP.get(word.lower())
        if not simpler:
            continue

        pattern = re.compile(rf"\b{re.escape(word)}\b", flags=re.IGNORECASE)

        def repl(match: re.Match) -> str:
            original = match.group(0)
            final_word = preserve_case(original, simpler)
            replacements_used.append(
                {
                    "from": original,
                    "to": final_word,
                }
            )
            return final_word

        rewritten = pattern.sub(repl, rewritten)

    return rewritten, replacements_used


def build_mock_example_sentence(target_word: str, target_language: str, learner_level: str) -> str:
    level = learner_level.lower()

    if level == "beginner":
        return f"I know {target_word}."

    if level == "elementary":
        return f"I use {target_word} every day."

    if level == "intermediate":
        return f"I can say {target_word} in a simple {target_language} sentence."

    if level == "advanced":
        return f"I use {target_word} naturally in {target_language}."

    return f"I use {target_word}."


def extract_text_from_openai_response(response: Any) -> str:
    text_parts: list[str] = []

    output = getattr(response, "output", None) or []
    for item in output:
        content = getattr(item, "content", None) or []
        for part in content:
            if getattr(part, "type", None) == "output_text":
                text_parts.append(getattr(part, "text", ""))

    return "\n".join([part for part in text_parts if part]).strip()


def extract_json_object(text: str) -> dict:
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in model output")

    return json.loads(text[start : end + 1])


def build_generation_prompt(
    target_word: str,
    translation: str,
    target_language: str,
    learner_level: str,
    native_language: str | None,
) -> str:
    return f"""
You are generating one learner-friendly example sentence.

Rules:
- Target language: {target_language}
- Learner level: {learner_level}
- Native language: {native_language or "English"}
- Focus word: {target_word}
- Meaning of focus word: {translation}
- Use the focus word naturally in exactly one short sentence
- Keep the sentence very simple
- Prefer words that a beginner would already know
- Avoid difficult words around the focus word
- Return only the sentence
""".strip()


def build_refinement_prompt(
    target_word: str,
    translation: str,
    target_language: str,
    learner_level: str,
    previous_sentence: str,
    advanced_words: list[str],
) -> str:
    advanced_display = ", ".join(advanced_words) if advanced_words else "none"

    return f"""
Rewrite the sentence for a language learner.

Rules:
- Target language: {target_language}
- Learner level: {learner_level}
- Focus word: {target_word}
- Meaning of focus word: {translation}
- Keep the focus word in the sentence exactly once if possible
- Replace or simplify these non-focus difficult words: {advanced_display}
- Use only very common beginner-friendly surrounding words
- Keep the sentence short and natural
- Preserve the meaning as much as possible
- Return only one rewritten sentence
- Do not explain your answer

Original sentence:
{previous_sentence}
""".strip()


def build_initial_quiz_prompt(
    target_language: str,
    native_language: str | None,
    learner_level: str | None,
    quiz_size: int,
) -> str:
    return f"""
Generate a very basic vocabulary quiz for a language learner.

Rules:
- Target language: {target_language}
- Learner native language: {native_language or "English"}
- Learner level: {learner_level or "Beginner"}
- Number of quiz words: {quiz_size}
- Pick extremely common beginner words
- Good categories: greeting, thank you, water, house, eat
- Return JSON only
- Format:
{{
  "items": [
    {{
      "targetWord": "....",
      "translation": "...."
    }}
  ]
}}
""".strip()


def build_sentence_translation_prompt(
    sentence: str,
    target_language: str,
    native_language: str | None,
) -> str:
    return f"""
Translate this sentence accurately.

Rules:
- Original sentence language: {target_language}
- Translate into: {native_language or "English"}
- Return only the translated sentence
- Do not explain anything

Sentence:
{sentence}
""".strip()


def build_mock_initial_quiz(target_language: str) -> list[dict]:
    bank = {
        "Spanish": [
            {"targetWord": "hola", "translation": "hello"},
            {"targetWord": "gracias", "translation": "thank you"},
            {"targetWord": "agua", "translation": "water"},
            {"targetWord": "casa", "translation": "house"},
            {"targetWord": "comer", "translation": "to eat"},
        ],
        "English": [
            {"targetWord": "hello", "translation": "hello"},
            {"targetWord": "water", "translation": "water"},
            {"targetWord": "friend", "translation": "friend"},
            {"targetWord": "house", "translation": "house"},
            {"targetWord": "eat", "translation": "to eat"},
        ],
        "Nepali": [
            {"targetWord": "नमस्ते", "translation": "hello"},
            {"targetWord": "धन्यवाद", "translation": "thank you"},
            {"targetWord": "पानी", "translation": "water"},
            {"targetWord": "घर", "translation": "house"},
            {"targetWord": "खानु", "translation": "to eat"},
        ],
        "Hindi": [
            {"targetWord": "नमस्ते", "translation": "hello"},
            {"targetWord": "धन्यवाद", "translation": "thank you"},
            {"targetWord": "पानी", "translation": "water"},
            {"targetWord": "घर", "translation": "house"},
            {"targetWord": "खाना", "translation": "to eat"},
        ],
    }
    return bank.get(target_language, bank["English"])


def generate_sentence_with_openai(
    target_word: str,
    translation: str,
    target_language: str,
    learner_level: str,
    native_language: str | None,
) -> str:
    if not openai_client:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is missing")

    prompt = build_generation_prompt(
        target_word, translation, target_language, learner_level, native_language
    )

    response = openai_client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
    )

    text = extract_text_from_openai_response(response)
    if not text:
        raise HTTPException(status_code=500, detail="OpenAI returned no text")

    return text.splitlines()[0].strip()


async def generate_sentence_with_ollama(
    target_word: str,
    translation: str,
    target_language: str,
    learner_level: str,
    native_language: str | None,
) -> str:
    prompt = build_generation_prompt(
        target_word, translation, target_language, learner_level, native_language
    )

    async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
            },
        )

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Ollama generation failed")

    data = response.json()
    text = (data.get("response") or "").strip()

    if not text:
        raise HTTPException(status_code=500, detail="Ollama returned no text")

    return text.splitlines()[0].strip()


async def generate_sentence(
    target_word: str,
    translation: str,
    target_language: str,
    learner_level: str,
    native_language: str | None,
) -> str:
    if AI_PROVIDER == "openai":
        return generate_sentence_with_openai(
            target_word, translation, target_language, learner_level, native_language
        )

    if AI_PROVIDER == "ollama":
        return await generate_sentence_with_ollama(
            target_word, translation, target_language, learner_level, native_language
        )

    return build_mock_example_sentence(target_word, target_language, learner_level)


def refine_sentence_with_openai(
    target_word: str,
    translation: str,
    target_language: str,
    learner_level: str,
    previous_sentence: str,
    advanced_words: list[str],
) -> str:
    if not openai_client:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is missing")

    prompt = build_refinement_prompt(
        target_word,
        translation,
        target_language,
        learner_level,
        previous_sentence,
        advanced_words,
    )

    response = openai_client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
    )

    text = extract_text_from_openai_response(response)
    if not text:
        raise HTTPException(status_code=500, detail="OpenAI returned no refinement text")

    return text.splitlines()[0].strip()


async def refine_sentence_with_ollama(
    target_word: str,
    translation: str,
    target_language: str,
    learner_level: str,
    previous_sentence: str,
    advanced_words: list[str],
) -> str:
    prompt = build_refinement_prompt(
        target_word,
        translation,
        target_language,
        learner_level,
        previous_sentence,
        advanced_words,
    )

    async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
            },
        )

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Ollama refinement failed")

    data = response.json()
    text = (data.get("response") or "").strip()

    if not text:
        raise HTTPException(status_code=500, detail="Ollama returned no refinement text")

    return text.splitlines()[0].strip()


async def refine_sentence(
    target_word: str,
    translation: str,
    target_language: str,
    learner_level: str,
    previous_sentence: str,
    advanced_words: list[str],
) -> tuple[str, list[dict], str]:
    if AI_PROVIDER == "openai":
        rewritten = refine_sentence_with_openai(
            target_word,
            translation,
            target_language,
            learner_level,
            previous_sentence,
            advanced_words,
        )
        return (
            rewritten,
            [{"from": word, "to": "provider-rewrite"} for word in advanced_words],
            "openai",
        )

    if AI_PROVIDER == "ollama":
        rewritten = await refine_sentence_with_ollama(
            target_word,
            translation,
            target_language,
            learner_level,
            previous_sentence,
            advanced_words,
        )
        return (
            rewritten,
            [{"from": word, "to": "provider-rewrite"} for word in advanced_words],
            "ollama",
        )

    rewritten, replacements_used = simplify_sentence_rule_based(
        previous_sentence,
        advanced_words,
    )
    return rewritten, replacements_used, "mock-rule-based"


def generate_initial_quiz_with_openai(
    target_language: str,
    native_language: str | None,
    learner_level: str | None,
    quiz_size: int,
) -> list[dict]:
    if not openai_client:
        return build_adaptive_quiz_from_bank(
            target_language=target_language,
            learner_level=learner_level,
            quiz_size=quiz_size,
        )

    prompt = build_placement_prompt(
        target_language=target_language,
        native_language=native_language,
        learner_level=learner_level,
        quiz_size=quiz_size,
    )

    try:
        response = openai_client.responses.create(
            model=OPENAI_MODEL,
            input=prompt,
        )

        text = extract_text_from_openai_response(response)
        if not text:
            raise ValueError("No quiz text returned")

        items = parse_quiz_items_from_text(text)
        if not items:
            raise ValueError("No valid quiz items parsed")

        return items[:quiz_size]
    except Exception:
        return build_adaptive_quiz_from_bank(
            target_language=target_language,
            learner_level=learner_level,
            quiz_size=quiz_size,
        )


async def generate_initial_quiz_with_ollama(
    target_language: str,
    native_language: str | None,
    learner_level: str | None,
    quiz_size: int,
) -> list[dict]:
    prompt = build_placement_prompt(
        target_language=target_language,
        native_language=native_language,
        learner_level=learner_level,
        quiz_size=quiz_size,
    )

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                },
            )

        if response.status_code != 200:
            raise ValueError("Ollama placement quiz failed")

        data = response.json()
        text = (data.get("response") or "").strip()

        if not text:
            raise ValueError("No quiz text returned")

        items = parse_quiz_items_from_text(text)
        if not items:
            raise ValueError("No valid quiz items parsed")

        return items[:quiz_size]
    except Exception:
        return build_adaptive_quiz_from_bank(
            target_language=target_language,
            learner_level=learner_level,
            quiz_size=quiz_size,
        )


async def generate_initial_quiz(
    target_language: str,
    native_language: str | None,
    learner_level: str | None,
    quiz_size: int,
) -> list[dict]:
    quiz_size = max(8, min(quiz_size, 15))

    if AI_PROVIDER == "openai":
        return generate_initial_quiz_with_openai(
            target_language, native_language, learner_level, quiz_size
        )

    if AI_PROVIDER == "ollama":
        return await generate_initial_quiz_with_ollama(
            target_language, native_language, learner_level, quiz_size
        )

    return build_adaptive_quiz_from_bank(
        target_language=target_language,
        learner_level=learner_level,
        quiz_size=quiz_size,
    )


def translate_sentence_with_openai(
    sentence: str,
    target_language: str,
    native_language: str | None,
) -> str:
    if not openai_client:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is missing")

    prompt = build_sentence_translation_prompt(
        sentence,
        target_language,
        native_language,
    )

    response = openai_client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
    )

    text = extract_text_from_openai_response(response)
    if not text:
        raise HTTPException(status_code=500, detail="OpenAI returned no translation text")

    return text.splitlines()[0].strip()


async def translate_sentence_with_ollama(
    sentence: str,
    target_language: str,
    native_language: str | None,
) -> str:
    prompt = build_sentence_translation_prompt(
        sentence,
        target_language,
        native_language,
    )

    async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
            },
        )

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Ollama translation failed")

    data = response.json()
    text = (data.get("response") or "").strip()

    if not text:
        raise HTTPException(status_code=500, detail="Ollama returned no translation text")

    return text.splitlines()[0].strip()


async def translate_sentence(
    sentence: str,
    target_language: str,
    native_language: str | None,
) -> str:
    if AI_PROVIDER == "openai":
        return translate_sentence_with_openai(
            sentence,
            target_language,
            native_language,
        )

    if AI_PROVIDER == "ollama":
        try:
            return await translate_sentence_with_ollama(
                sentence,
                target_language,
                native_language,
            )
        except Exception:
            return build_native_translation(
                sentence,
                "",
                "",
                native_language,
            )

    return build_native_translation(sentence, "", "", native_language)

def normalize_translation_text(text: str) -> str:
    return text.strip().strip('"').strip("'")


def fallback_word_translation(word: str) -> str:
    return word

def translate_word_with_openai(
    word: str,
    target_language: str,
    native_language: str | None,
) -> str:
    if not openai_client:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is missing")

    prompt = build_word_translation_prompt(
        word,
        target_language,
        native_language,
    )

    response = openai_client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
    )

    text = extract_text_from_openai_response(response)
    if not text:
        raise HTTPException(status_code=500, detail="OpenAI returned no word translation")

    try:
        parsed = extract_json_object(text)
        translation = parsed.get("translation", "")
        if not translation:
            raise ValueError("Missing translation")
        return normalize_translation_text(str(translation))
    except Exception:
        return normalize_translation_text(text.splitlines()[0])

async def translate_word_with_ollama(
    word: str,
    target_language: str,
    native_language: str | None,
) -> str:
    prompt = build_word_translation_prompt(
        word,
        target_language,
        native_language,
    )

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                },
            )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Ollama word translation failed")

        data = response.json()
        text = (data.get("response") or "").strip()

        if not text:
            raise HTTPException(status_code=500, detail="Ollama returned no word translation")

        try:
            parsed = extract_json_object(text)
            translation = parsed.get("translation", "")
            if not translation:
                raise ValueError("Missing translation")
            return normalize_translation_text(str(translation))
        except Exception:
            return normalize_translation_text(text.splitlines()[0])

    except Exception:
        return fallback_word_translation(word)

async def translate_word(
    word: str,
    target_language: str,
    native_language: str | None,
) -> str:
    if AI_PROVIDER == "openai":
        try:
            return translate_word_with_openai(
                word,
                target_language,
                native_language,
            )
        except Exception:
            return fallback_word_translation(word)

    if AI_PROVIDER == "ollama":
        return await translate_word_with_ollama(
            word,
            target_language,
            native_language,
        )

    return fallback_word_translation(word)

def is_noise_token(word: str) -> bool:
    if len(word) < 2:
        return True

    if re.fullmatch(r"\d+", word):
        return True

    if re.search(r"[=_@#$%^&*<>/\\|~`]", word):
        return True

    return False


def score_candidate_word(word: str) -> int:
    score = 0

    if 2 <= len(word) <= 10:
        score += 3

    if re.fullmatch(r"[A-Za-zÀ-ÿ\u0900-\u097F']+", word):
        score += 2

    if len(set(word)) > 1:
        score += 1

    return score


def extract_candidate_words(source_text: str) -> list[str]:
    words = re.findall(r"[A-Za-zÀ-ÿ\u0900-\u097F']+", source_text)

    stop_words = {
        "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
        "to", "of", "in", "on", "at", "for", "with", "from", "by", "it",
        "this", "that", "these", "those", "i", "you", "he", "she", "we", "they",
        "me", "my", "our", "your", "their", "be", "as", "if", "then", "so",
    }

    unique_words = []
    seen = set()

    for raw_word in words:
        word = raw_word.strip().lower()

        if word in seen:
            continue
        seen.add(word)

        if word in stop_words:
            continue

        if is_noise_token(word):
            continue

        unique_words.append(word)

    ranked = sorted(unique_words, key=score_candidate_word, reverse=True)
    return ranked[:12]

@app.post("/generate-example")
async def generate_example(payload: ExampleRequest):
    level = payload.learner_level or "Beginner"

    example_sentence = await generate_sentence(
        payload.target_word,
        payload.translation,
        payload.target_language,
        level,
        payload.native_language,
    )

    explanation = build_explanation(
        payload.target_word,
        payload.translation,
        level,
    )

    example_translation_native = await translate_sentence(
        example_sentence,
        payload.target_language,
        payload.native_language,
    )

    gloss_items = build_gloss_items(
        example_sentence,
        payload.target_word,
        payload.translation,
    )

    return {
        "target_word": payload.target_word,
        "translation": payload.translation,
        "target_language": payload.target_language,
        "learner_level": level,
        "native_language": payload.native_language,
        "example_sentence": example_sentence,
        "example_translation_native": example_translation_native,
        "gloss_items": gloss_items,
        "explanation": explanation,
        "provider_used": AI_PROVIDER,
    }


@app.post("/refine-example")
async def refine_example(payload: RefineSentenceRequest):
    level = payload.learner_level or "Beginner"

    simplified_sentence, replacements_used, provider_used = await refine_sentence(
        payload.target_word,
        payload.translation,
        payload.target_language,
        level,
        payload.previous_sentence,
        payload.advanced_words,
    )

    if payload.target_word.lower() not in simplified_sentence.lower():
        simplified_sentence = build_mock_example_sentence(
            payload.target_word,
            payload.target_language,
            level,
        )
        replacements_used = []

    explanation = (
        f"This sentence was refined for a {level} learner by simplifying harder non-focus words and keeping the focus word visible."
    )

    example_translation_native = await translate_sentence(
        simplified_sentence,
        payload.target_language,
        "English",
    )

    return {
        "target_word": payload.target_word,
        "translation": payload.translation,
        "target_language": payload.target_language,
        "learner_level": level,
        "example_sentence": simplified_sentence,
        "example_translation_native": example_translation_native,
        "explanation": explanation,
        "replaced_advanced_words": payload.advanced_words,
        "replacements_used": replacements_used,
        "provider_used": provider_used,
    }


@app.post("/generate-deck-from-text")
async def generate_deck_from_text(payload: DeckGenerationRequest):
    learner_level = payload.learner_level or "Beginner"
    native_language = payload.native_language or "English"
    source_text = (payload.source_text or "").strip()

    if not source_text:
        raise HTTPException(status_code=400, detail="Source text is required")

    def normalize_source_text(text: str) -> str:
        text = text.replace("\r", "\n")
        text = text.replace("’", "'").replace("‘", "'")
        text = text.replace("“", '"').replace("”", '"')
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{2,}", "\n", text)
        return text.strip()

    def split_sentences(text: str) -> list[str]:
        parts = re.split(r"(?<=[.!?।¿¡])\s+|\n+", text)
        cleaned = [part.strip() for part in parts if part and part.strip()]
        return cleaned

    def is_noise_token(word: str) -> bool:
        if len(word) < 2:
            return True
        if len(word) > 24:
            return True
        if re.fullmatch(r"\d+", word):
            return True
        if re.search(r"\d", word):
            return True
        if re.search(r"[=_@#$%^&*<>/\\|~`+]", word):
            return True
        if re.search(r"(.)\1\1\1", word):
            return True
        if len(set(word)) == 1:
            return True
        return False

    def score_candidate(word: str, sentence: str) -> int:
        score = 0

        if 2 <= len(word) <= 10:
            score += 4
        elif len(word) <= 14:
            score += 2

        if re.fullmatch(r"[A-Za-zÀ-ÿ\u0900-\u097F']+", word):
            score += 3

        if 12 <= len(sentence) <= 120:
            score += 2

        if len(set(word)) > 2:
            score += 1

        return score

    stop_words = {
        "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
        "to", "of", "in", "on", "at", "for", "with", "from", "by", "it",
        "this", "that", "these", "those", "i", "you", "he", "she", "we", "they",
        "me", "my", "our", "your", "their", "be", "as", "if", "then", "so",
        "do", "does", "did", "have", "has", "had", "not", "very", "can", "will",
        "just", "into", "out", "up", "down", "about", "over", "under"
    }

    normalized_text = normalize_source_text(source_text)
    source_sentences = split_sentences(normalized_text)

    candidate_rows: list[dict] = []
    seen_words: set[str] = set()
    discarded_token_count = 0

    for sentence in source_sentences:
        raw_words = re.findall(r"[A-Za-zÀ-ÿ\u0900-\u097F']+", sentence)

        for raw_word in raw_words:
            word = raw_word.strip().lower().strip("'")

            if not word:
                discarded_token_count += 1
                continue

            if word in seen_words:
                continue

            if word in stop_words:
                discarded_token_count += 1
                continue

            if is_noise_token(word):
                discarded_token_count += 1
                continue

            seen_words.add(word)

            candidate_rows.append(
                {
                    "word": word,
                    "source_sentence": sentence,
                    "score": score_candidate(word, sentence),
                }
            )

    candidate_rows = sorted(
        candidate_rows,
        key=lambda row: (-row["score"], len(row["word"]), row["word"])
    )

    selected_candidates = candidate_rows[:12]

    cards = []
    for candidate in selected_candidates:
        word = candidate["word"]
        source_sentence = candidate["source_sentence"]

        translation = await translate_word(
            word,
            payload.target_language,
            native_language,
        )

        example_sentence = await generate_sentence(
            word,
            translation,
            payload.target_language,
            learner_level,
            native_language,
        )

        example_translation_native = await translate_sentence(
            example_sentence,
            payload.target_language,
            native_language,
        )

        gloss_items = build_gloss_items(
            example_sentence,
            word,
            translation,
        )

        cards.append(
            {
                "targetWord": word,
                "translation": translation,
                "pronunciation": None,
                "exampleSentence": example_sentence,
                "exampleTranslationNative": example_translation_native,
                "glossItems": gloss_items,
                "explanation": build_explanation(word, translation, learner_level),
                "metadata": {
                    "source": f"{AI_PROVIDER}-generated-from-text",
                    "learnerLevel": learner_level,
                    "sourceType": payload.source_type or "text",
                    "sourceSnippet": source_sentence,
                    "candidateScore": candidate["score"],
                },
            }
        )

    return {
        "title": f"{payload.target_language} AI Generated Deck",
        "language": payload.target_language,
        "difficultyLevel": learner_level,
        "category": "generated-from-text",
        "cards": cards,
        "provider_used": AI_PROVIDER,
        "candidate_count": len(selected_candidates),
        "discarded_token_count": discarded_token_count,
        "source_sentence_count": len(source_sentences),
    }

@app.post("/generate-initial-quiz")
async def generate_initial_quiz_endpoint(payload: InitialQuizRequest):
    quiz_size = payload.quiz_size or 5

    items = await generate_initial_quiz(
        payload.target_language,
        payload.native_language,
        payload.learner_level,
        quiz_size,
    )

    return {
        "target_language": payload.target_language,
        "native_language": payload.native_language,
        "learner_level": payload.learner_level,
        "quiz_size": quiz_size,
        "items": items,
        "provider_used": AI_PROVIDER,
    }


@app.post("/translate-sentence")
async def translate_sentence_endpoint(payload: SentenceTranslationRequest):
    translated = await translate_sentence(
        payload.sentence,
        payload.target_language,
        payload.native_language,
    )

    return {
        "sentence": payload.sentence,
        "translated_sentence": translated,
        "target_language": payload.target_language,
        "native_language": payload.native_language,
        "provider_used": AI_PROVIDER,
    }

@app.post("/sources/tatoeba/search")
async def tatoeba_search_endpoint(payload: TatoebaSearchRequest):
    if not payload.query or not payload.from_language:
        raise HTTPException(status_code=400, detail="Missing required information.")

    try:
        result = await search_tatoeba_sentences(
            query=payload.query,
            from_language=payload.from_language,
            to_language=payload.to_language,
            page=payload.page or 1,
            page_size=payload.page_size or 10,
        )
        return result
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Tatoeba search is temporarily unavailable.",
        )