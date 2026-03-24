import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type PlacementQuizRequestBody = {
  userId: string;
  answers: number[];
};

function estimateLevelFromScore(score: number): {
  estimatedLevel: string;
  confidence: number;
} {
  if (score <= 4) {
    return { estimatedLevel: "Beginner", confidence: 82 };
  }

  if (score <= 7) {
    return { estimatedLevel: "Elementary", confidence: 78 };
  }

  if (score <= 10) {
    return { estimatedLevel: "Intermediate", confidence: 74 };
  }

  return { estimatedLevel: "Advanced", confidence: 70 };
}

export async function POST(request: NextRequest) {
  try {
    const body: PlacementQuizRequestBody = await request.json();
    const { userId, answers } = body;

    if (!userId || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: "userId and answers are required" },
        { status: 400 }
      );
    }

    const userCheck = await db.query(
      `SELECT id FROM users WHERE id = $1`,
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const score = answers.reduce((sum, current) => sum + current, 0);
    const { estimatedLevel, confidence } = estimateLevelFromScore(score);

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const quizResult = await client.query(
        `
          INSERT INTO placement_quizzes (user_id, score, estimated_level, confidence)
          VALUES ($1, $2, $3, $4)
          RETURNING id, user_id, score, estimated_level, confidence, created_at
        `,
        [userId, score, estimatedLevel, confidence]
      );

      await client.query(
        `
          UPDATE learner_profiles
          SET verified_level = $1,
              updated_at = NOW()
          WHERE user_id = $2
        `,
        [estimatedLevel, userId]
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: "Placement quiz submitted successfully",
          result: quizResult.rows[0],
        },
        { status: 201 }
      );
    } catch (transactionError) {
      await client.query("ROLLBACK");
      throw transactionError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Placement quiz API error:", error);

    return NextResponse.json(
      {
        error: "Failed to process placement quiz",
      },
      { status: 500 }
    );
  }
}