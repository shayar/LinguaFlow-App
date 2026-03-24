import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";
import { db } from "@/lib/db";

type GenerateCheckedExampleBody = {
  targetWord: string;
  translation: string;
  targetLanguage: string;
  learnerLevel: string;
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const body: GenerateCheckedExampleBody = await request.json();
    const { targetWord, translation, targetLanguage, learnerLevel } = body;

    if (!targetWord || !translation || !targetLanguage || !learnerLevel) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const profileResult = await db.query(
      `
        SELECT native_language
        FROM learner_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [currentUser.id]
    );

    const nativeLanguage = profileResult.rows[0]?.native_language ?? "English";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const maxIterations = 5;

    let currentSentence = "";
    let currentExplanation = "";
    let currentExampleTranslationNative = "";
    let finalCheck: any = null;
    let iteration = 0;

    const refinementHistory: Array<{
      iteration: number;
      sentenceBefore: string;
      advancedWords: string[];
      replacementsUsed?: Array<{ from: string; to: string }>;
      acceptedStrictly?: boolean;
      acceptedLoosely?: boolean;
      difficultyScore?: number;
    }> = [];

    const initialGenerateResponse = await fetch(`${appUrl}/api/ai/generate-example`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target_word: targetWord,
        translation,
        target_language: targetLanguage,
        learner_level: learnerLevel,
        native_language: nativeLanguage,
      }),
    });

    const initialGenerateResult = await initialGenerateResponse.json();

    if (!initialGenerateResponse.ok) {
      return NextResponse.json(
        { error: initialGenerateResult.error || "Failed to generate initial example" },
        { status: 500 }
      );
    }

    currentSentence = initialGenerateResult.example_sentence;
    currentExplanation = initialGenerateResult.explanation;
    currentExampleTranslationNative =
      initialGenerateResult.example_translation_native ?? "";

    while (iteration < maxIterations) {
      const checkResponse = await fetch(`${appUrl}/api/ai/check-sentence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentence: currentSentence,
          targetLanguage,
          targetWord,
        }),
      });

      const checkResult = await checkResponse.json();

      if (!checkResponse.ok) {
        return NextResponse.json(
          { error: checkResult.error || "Failed to check generated sentence" },
          { status: 500 }
        );
      }

      finalCheck = checkResult;

      if (checkResult.acceptedStrictly === true) {
        break;
      }

      refinementHistory.push({
        iteration: iteration + 1,
        sentenceBefore: currentSentence,
        advancedWords: checkResult.unknownNonFocusWords ?? [],
        acceptedStrictly: checkResult.acceptedStrictly ?? false,
        acceptedLoosely: checkResult.acceptedLoosely ?? false,
        difficultyScore: checkResult.difficultyScore ?? 0,
      });

      const refineResponse = await fetch(`${appUrl}/api/ai/refine-example`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_word: targetWord,
          translation,
          target_language: targetLanguage,
          learner_level: learnerLevel,
          previous_sentence: currentSentence,
          advanced_words: checkResult.unknownNonFocusWords ?? [],
        }),
      });

      const refineResult = await refineResponse.json();

      if (!refineResponse.ok) {
        return NextResponse.json(
          { error: refineResult.error || "Failed to refine generated sentence" },
          { status: 500 }
        );
      }

      refinementHistory[refinementHistory.length - 1].replacementsUsed =
        refineResult.replacements_used ?? [];

      currentSentence = refineResult.example_sentence;
      currentExplanation = refineResult.explanation;
      currentExampleTranslationNative =
        refineResult.example_translation_native ??
        `${currentSentence} [${nativeLanguage} meaning: ${translation}]`;

      iteration += 1;
    }

    if (!finalCheck?.acceptedStrictly) {
      const fallbackSentence =
        learnerLevel.toLowerCase() === "beginner"
          ? `${targetWord} means ${translation}.`
          : `I use ${targetWord} to mean ${translation}.`;

      const fallbackCheckResponse = await fetch(`${appUrl}/api/ai/check-sentence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentence: fallbackSentence,
          targetLanguage,
          targetWord,
        }),
      });

      const fallbackCheckResult = await fallbackCheckResponse.json();

      if (fallbackCheckResponse.ok) {
        currentSentence = fallbackSentence;
        currentExplanation =
          "A simpler fallback sentence was used to reduce unknown non-focus words.";
        finalCheck = fallbackCheckResult;

        const translationResponse = await fetch(`${appUrl}/api/ai/translate-sentence`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sentence: currentSentence,
            target_language: targetLanguage,
            native_language: nativeLanguage,
          }),
        });

        const translationResult = await translationResponse.json();

        if (translationResponse.ok) {
          currentExampleTranslationNative = translationResult.translated_sentence;
        } else {
          currentExampleTranslationNative = `${currentSentence} [${nativeLanguage} meaning: ${translation}]`;
        }
      }
    } else {
      const translationResponse = await fetch(`${appUrl}/api/ai/translate-sentence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentence: currentSentence,
          target_language: targetLanguage,
          native_language: nativeLanguage,
        }),
      });

      const translationResult = await translationResponse.json();

      if (translationResponse.ok) {
        currentExampleTranslationNative = translationResult.translated_sentence;
      }
    }

    return NextResponse.json({
      targetWord,
      translation,
      targetLanguage,
      learnerLevel,
      nativeLanguage,
      exampleSentence: currentSentence,
      exampleTranslationNative: currentExampleTranslationNative,
      explanation: currentExplanation,
      iterationsUsed: iteration,
      finalCheck,
      refinementHistory,
      acceptedStrictly: finalCheck?.acceptedStrictly ?? false,
      acceptedLoosely: finalCheck?.acceptedLoosely ?? false,
      difficultyScore: finalCheck?.difficultyScore ?? 0,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Generate checked example error:", error);

    return NextResponse.json(
      { error: "Failed to generate checked example" },
      { status: 500 }
    );
  }
}