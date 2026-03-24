import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type Body = {
  targetLanguage: string;
  knownWords: string[];
  score: number;
  total: number;
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: Body = await request.json();

    const { targetLanguage, knownWords, score, total } = body;

    for (const word of knownWords || []) {
      await db.query(
        `
          INSERT INTO known_words (
            user_id,
            language,
            word,
            confidence_score
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, language, word)
          DO UPDATE SET confidence_score = GREATEST(known_words.confidence_score, EXCLUDED.confidence_score)
        `,
        [currentUser.id, targetLanguage, word.toLowerCase(), 25]
      );
    }

    let verifiedLevel = "Beginner";
    if (total > 0) {
      const ratio = score / total;
      if (ratio >= 0.8) verifiedLevel = "Elementary";
    }

    await db.query(
      `
        UPDATE learner_profiles
        SET verified_level = $1,
            initial_quiz_completed = TRUE,
            updated_at = NOW()
        WHERE user_id = $2
      `,
      [verifiedLevel, currentUser.id]
    );

    return NextResponse.json({
      message: "Initial quiz submitted successfully",
      verifiedLevel,
      knownWordsAdded: knownWords.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Initial quiz submit error:", error);

    return NextResponse.json(
      { error: "Failed to submit initial quiz" },
      { status: 500 }
    );
  }
}