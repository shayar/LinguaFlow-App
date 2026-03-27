from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ExampleMode = Literal["phrase", "micro_sentence", "guided_sentence", "natural_sentence"]


@dataclass
class ExampleModeDecision:
    mode: ExampleMode
    reason: str
    known_word_count: int
    learner_level: str


def normalize_level(level: str | None) -> str:
    if not level:
        return "beginner"

    normalized = level.strip().lower()
    if normalized in {"advanced", "intermediate", "elementary", "beginner"}:
        return normalized

    return "beginner"


def choose_example_mode(
    known_word_count: int,
    learner_level: str | None,
) -> ExampleModeDecision:
    level = normalize_level(learner_level)

    if known_word_count < 15:
        return ExampleModeDecision(
            mode="phrase",
            reason="Very small known-word list; use phrase mode.",
            known_word_count=known_word_count,
            learner_level=level,
        )

    if known_word_count < 40:
        return ExampleModeDecision(
            mode="micro_sentence",
            reason="Small known-word list; use micro-sentence mode.",
            known_word_count=known_word_count,
            learner_level=level,
        )

    if known_word_count < 120:
        return ExampleModeDecision(
            mode="guided_sentence",
            reason="Moderate known-word coverage; use guided sentence mode.",
            known_word_count=known_word_count,
            learner_level=level,
        )

    if level in {"advanced", "intermediate"}:
        return ExampleModeDecision(
            mode="natural_sentence",
            reason="Large known-word list and higher level; allow natural sentence mode.",
            known_word_count=known_word_count,
            learner_level=level,
        )

    return ExampleModeDecision(
        mode="guided_sentence",
        reason="Fallback to guided sentence mode.",
        known_word_count=known_word_count,
        learner_level=level,
    )


def build_mode_prompt(
    mode: ExampleMode,
    target_word: str,
    translation: str,
    target_language: str,
    native_language: str | None,
    learner_level: str | None,
) -> str:
    native = native_language or "English"
    level = normalize_level(learner_level)

    common_rules = f"""
Target language: {target_language}
Native language: {native}
Learner level: {level}
Focus word: {target_word}
Meaning: {translation}

Rules:
- Return JSON only.
- Highlighting is handled by the frontend, not by you.
- Use the focus word exactly once.
- Keep wording very simple.
- Avoid extra explanation.
- Only output:
{{
  "content": "...",
  "mode": "{mode}"
}}
""".strip()

    if mode == "phrase":
        return (
            common_rules
            + """

Mode-specific rules:
- Produce a very short phrase, not a full sentence.
- 2 to 4 words only.
- Examples: "my book", "eat rice", "red car"
- Avoid punctuation unless clearly needed.
""".strip()
        )

    if mode == "micro_sentence":
        return (
            common_rules
            + """

Mode-specific rules:
- Produce a tiny sentence.
- 3 to 6 words.
- One clause only.
- Very common grammar only.
- Example style: "I eat rice." / "This is water."
""".strip()
        )

    if mode == "guided_sentence":
        return (
            common_rules
            + """

Mode-specific rules:
- Produce one short simple sentence.
- 5 to 9 words.
- Keep grammar natural but easy.
- One clause only.
""".strip()
        )

    return (
        common_rules
        + """

Mode-specific rules:
- Produce one natural but concise sentence.
- 6 to 12 words.
- Still keep it learner-friendly.
- Avoid rare words.
""".strip()
    )


def fallback_content_for_mode(
    mode: ExampleMode,
    target_word: str,
    translation: str,
) -> str:
    if mode == "phrase":
        return f"my {target_word}"

    if mode == "micro_sentence":
        return f"This is {target_word}."

    if mode == "guided_sentence":
        return f"I use {target_word}."

    return f"I use {target_word} every day."