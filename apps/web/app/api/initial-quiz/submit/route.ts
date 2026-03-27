import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type InitialQuizSubmitBody = {
  targetLanguage: string;
  knownWords: string[];
  score: number;
  total: number;
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: InitialQuizSubmitBody = await request.json();

    const { targetLanguage, knownWords, score, total } = body;

    if (!targetLanguage || !Array.isArray(knownWords)) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      for (const rawWord of knownWords) {
        const word = rawWord.trim().toLowerCase();
        if (!word) continue;

        await client.query(
          `
            INSERT INTO known_words (
              user_id,
              language,
              word,
              source,
              confidence_score
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id, language, word)
            DO UPDATE SET
              confidence_score = GREATEST(known_words.confidence_score, EXCLUDED.confidence_score),
              updated_at = NOW()
          `,
          [currentUser.id, targetLanguage, word, "initial_quiz", 100]
        );
      }

      await client.query(
        `
          UPDATE learner_profiles
          SET
            initial_quiz_completed = TRUE,
            initial_assessment_completed_at = NOW(),
            initial_assessment_locked = TRUE,
            onboarding_completed = TRUE,
            updated_at = NOW()
          WHERE user_id = $1
        `,
        [currentUser.id]
      );

      await client.query(
        `
          INSERT INTO placement_quizzes (
            user_id,
            score,
            estimated_level,
            confidence
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          currentUser.id,
          score,
          "Beginner",
          total > 0 ? Math.round((score / total) * 100) : 0,
        ]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        message: "Initial quiz submitted successfully.",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Initial quiz submit API error:", error);

    return NextResponse.json(
      { error: "Failed to submit initial quiz." },
      { status: 500 }
    );
  }
}