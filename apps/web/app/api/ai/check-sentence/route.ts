import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type CheckSentenceBody = {
  sentence: string;
  targetLanguage: string;
  targetWord?: string;
};

function tokenize(text: string): string[] {
  const matches = text
    .toLowerCase()
    .match(/[a-zà-ÿ\u0900-\u097F']+/g);

  return matches ?? [];
}

const ALLOWED_BASIC_WORDS = new Set([
  "i",
  "you",
  "he",
  "she",
  "we",
  "they",
  "it",
  "me",
  "my",
  "your",
  "our",
  "their",
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "is",
  "are",
  "was",
  "were",
  "am",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "with",
  "from",
  "by",
  "this",
  "that",
  "these",
  "those",
  "here",
  "there",
  "very",
  "yes",
  "no",
  "not",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "be",
  "as",
  "if",
  "so",
  "too",
  "can",
  "will",
  "just",
]);

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: CheckSentenceBody = await request.json();

    const { sentence, targetLanguage, targetWord } = body;

    if (!sentence || !targetLanguage) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const knownWordsResult = await db.query(
      `
        SELECT word
        FROM known_words
        WHERE user_id = $1
          AND language = $2
      `,
      [currentUser.id, targetLanguage]
    );

    const knownWordsSet = new Set(
      knownWordsResult.rows.map((row) => String(row.word).toLowerCase())
    );

    const tokens = tokenize(sentence);
    const uniqueTokens = Array.from(new Set(tokens));
    const focus = targetWord?.toLowerCase() ?? null;

    const focusWords: string[] = [];
    const knownWordsMatched: string[] = [];
    const allowedBasicWordsMatched: string[] = [];
    const unknownNonFocusWords: string[] = [];

    for (const word of uniqueTokens) {
      if (focus && word === focus) {
        focusWords.push(word);
        continue;
      }

      if (knownWordsSet.has(word)) {
        knownWordsMatched.push(word);
        continue;
      }

      if (ALLOWED_BASIC_WORDS.has(word)) {
        allowedBasicWordsMatched.push(word);
        continue;
      }

      unknownNonFocusWords.push(word);
    }

    const tokenCount = uniqueTokens.length;
    const advancedWordCount = unknownNonFocusWords.length;

    const difficultyScore =
      tokenCount === 0
        ? 0
        : Number((advancedWordCount / tokenCount).toFixed(2));

    const acceptedStrictly = advancedWordCount === 0;
    const acceptedLoosely = advancedWordCount <= 1;

    return NextResponse.json({
      sentence,
      targetLanguage,
      targetWord: targetWord ?? null,
      tokenCount,
      focusWords,
      knownWordsMatched,
      allowedBasicWordsMatched,
      unknownNonFocusWords,
      advancedWords: unknownNonFocusWords,
      advancedWordCount,
      difficultyScore,
      acceptedStrictly,
      acceptedLoosely,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Sentence check API error:", error);

    return NextResponse.json(
      { error: "Failed to check sentence difficulty." },
      { status: 500 }
    );
  }
}