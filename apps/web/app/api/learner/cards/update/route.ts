import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type UpdateLearnerCardBody = {
  learnerCardId: string;
  bucket: "known" | "learning" | "hard";
};

function getNextReviewDate(
  bucket: "known" | "learning" | "hard",
  streakCount: number
) {
  const now = new Date();

  if (bucket === "hard") {
    now.setMinutes(now.getMinutes() + 15);
    return now;
  }

  if (bucket === "learning") {
    if (streakCount <= 1) {
      now.setHours(now.getHours() + 8);
      return now;
    }

    if (streakCount <= 3) {
      now.setDate(now.getDate() + 1);
      return now;
    }

    now.setDate(now.getDate() + 2);
    return now;
  }

  if (bucket === "known") {
    if (streakCount <= 1) {
      now.setDate(now.getDate() + 3);
      return now;
    }

    if (streakCount <= 3) {
      now.setDate(now.getDate() + 7);
      return now;
    }

    if (streakCount <= 6) {
      now.setDate(now.getDate() + 14);
      return now;
    }

    now.setDate(now.getDate() + 30);
    return now;
  }

  now.setDate(now.getDate() + 1);
  return now;
}

function getUpdatedMasteryScore(
  previousScore: number,
  bucket: "known" | "learning" | "hard"
) {
  if (bucket === "known") return Math.min(previousScore + 12, 100);
  if (bucket === "learning") return Math.min(previousScore + 4, 100);
  return Math.max(previousScore - 8, 0);
}

function getUpdatedStreakCount(
  previousStreak: number,
  bucket: "known" | "learning" | "hard"
) {
  if (bucket === "hard") return 0;
  return previousStreak + 1;
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: UpdateLearnerCardBody = await request.json();

    const { learnerCardId, bucket } = body;

    if (!learnerCardId || !bucket) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    if (!["known", "learning", "hard"].includes(bucket)) {
      return NextResponse.json(
        { error: "Invalid review result." },
        { status: 400 }
      );
    }

    const existingResult = await db.query(
      `
        SELECT
          id,
          user_id,
          bucket,
          mastery_score,
          streak_count
        FROM learner_cards
        WHERE id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [learnerCardId, currentUser.id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Learner card not found." },
        { status: 404 }
      );
    }

    const existing = existingResult.rows[0];
    const updatedStreakCount = getUpdatedStreakCount(
      existing.streak_count ?? 0,
      bucket
    );
    const updatedMasteryScore = getUpdatedMasteryScore(
      existing.mastery_score ?? 0,
      bucket
    );
    const nextReviewAt = getNextReviewDate(bucket, updatedStreakCount);

    const updateResult = await db.query(
      `
        UPDATE learner_cards
        SET
          bucket = $1,
          mastery_score = $2,
          streak_count = $3,
          last_reviewed_at = NOW(),
          next_review_at = $4,
          updated_at = NOW()
        WHERE id = $5
          AND user_id = $6
        RETURNING
          id,
          user_id,
          card_id,
          bucket,
          mastery_score,
          streak_count,
          next_review_at,
          last_reviewed_at,
          created_at,
          updated_at
      `,
      [
        bucket,
        updatedMasteryScore,
        updatedStreakCount,
        nextReviewAt.toISOString(),
        learnerCardId,
        currentUser.id,
      ]
    );

    return NextResponse.json({
      message: "Learner card updated successfully.",
      learnerCard: updateResult.rows[0],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Learner card update error:", error);

    return NextResponse.json(
      { error: "Failed to update learner card." },
      { status: 500 }
    );
  }
} 