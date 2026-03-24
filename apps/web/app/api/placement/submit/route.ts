import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type PlacementAnswer = {
  targetWord: string;
  translation: string;
  difficulty?: "easy" | "medium" | "hard";
  answer: "know" | "unsure" | "dont_know";
};

type PlacementSubmitBody = {
  answers: PlacementAnswer[];
  targetLanguage: string;
};

function getAnswerScore(answer: "know" | "unsure" | "dont_know") {
  if (answer === "know") return 1;
  if (answer === "unsure") return 0.5;
  return 0;
}

function inferVerifiedLevel(
  easyRate: number,
  mediumRate: number,
  hardRate: number,
  selfReportedLevel: string | null
) {
  if (hardRate >= 0.7 && mediumRate >= 0.8) return "Advanced";
  if (mediumRate >= 0.7 && easyRate >= 0.85) return "Intermediate";
  if (easyRate >= 0.65) return "Elementary";

  if ((selfReportedLevel ?? "").toLowerCase() === "advanced") {
    return "Intermediate";
  }

  return "Beginner";
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: PlacementSubmitBody = await request.json();

    const { answers, targetLanguage } = body;

    if (!answers || !Array.isArray(answers) || answers.length === 0 || !targetLanguage) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const profileResult = await db.query(
      `
        SELECT self_reported_level
        FROM learner_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [currentUser.id]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Learner profile not found." },
        { status: 404 }
      );
    }

    const selfReportedLevel = profileResult.rows[0].self_reported_level ?? null;

    const easyItems = answers.filter((item) => item.difficulty === "easy");
    const mediumItems = answers.filter((item) => item.difficulty === "medium");
    const hardItems = answers.filter((item) => item.difficulty === "hard");

    const easyRate =
      easyItems.length > 0
        ? easyItems.reduce((sum, item) => sum + getAnswerScore(item.answer), 0) / easyItems.length
        : 0;

    const mediumRate =
      mediumItems.length > 0
        ? mediumItems.reduce((sum, item) => sum + getAnswerScore(item.answer), 0) / mediumItems.length
        : 0;

    const hardRate =
      hardItems.length > 0
        ? hardItems.reduce((sum, item) => sum + getAnswerScore(item.answer), 0) / hardItems.length
        : 0;

    const verifiedLevel = inferVerifiedLevel(
      easyRate,
      mediumRate,
      hardRate,
      selfReportedLevel
    );

    const knownWords = answers.filter((item) => item.answer === "know");
    const unsureWords = answers.filter((item) => item.answer === "unsure");

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
          UPDATE learner_profiles
          SET
            verified_level = $1,
            updated_at = NOW()
          WHERE user_id = $2
        `,
        [verifiedLevel, currentUser.id]
      );

      for (const item of knownWords) {
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
          [
            currentUser.id,
            targetLanguage,
            item.targetWord.toLowerCase(),
            "placement_quiz",
            1.0,
          ]
        );
      }

      for (const item of unsureWords) {
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
          [
            currentUser.id,
            targetLanguage,
            item.targetWord.toLowerCase(),
            "placement_quiz_unsure",
            0.5,
          ]
        );
      }

      await client.query("COMMIT");

      return NextResponse.json({
        message: "Placement results saved successfully.",
        verifiedLevel,
        stats: {
          easyRate,
          mediumRate,
          hardRate,
          knownCount: knownWords.length,
          unsureCount: unsureWords.length,
        },
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

    console.error("Placement submit API error:", error);

    return NextResponse.json(
      { error: "Failed to save placement results." },
      { status: 500 }
    );
  }
}