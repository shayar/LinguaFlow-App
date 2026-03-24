import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session." },
        { status: 400 }
      );
    }

    const sessionResult = await db.query(
      `
        SELECT id, started_at, ended_at, session_type
        FROM study_sessions
        WHERE id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [sessionId, currentUser.id]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    const summaryResult = await db.query(
      `
        SELECT
          COUNT(sre.id)::int AS total_reviews,
          COALESCE(SUM(CASE WHEN sre.result = 'known' THEN 1 ELSE 0 END), 0)::int AS known_count,
          COALESCE(SUM(CASE WHEN sre.result = 'learning' THEN 1 ELSE 0 END), 0)::int AS learning_count,
          COALESCE(SUM(CASE WHEN sre.result = 'hard' THEN 1 ELSE 0 END), 0)::int AS hard_count,
          COALESCE(AVG(sre.response_time_ms), 0)::float AS average_response_time_ms
        FROM study_review_events sre
        INNER JOIN learner_cards lc ON lc.id = sre.learner_card_id
        WHERE sre.session_id = $1
          AND lc.user_id = $2
      `,
      [sessionId, currentUser.id]
    );

    const reviewedWordsResult = await db.query(
      `
        SELECT
          c.target_word,
          c.translation,
          sre.result,
          sre.bucket_after,
          sre.response_time_ms,
          sre.created_at
        FROM study_review_events sre
        INNER JOIN learner_cards lc ON lc.id = sre.learner_card_id
        INNER JOIN cards c ON c.id = lc.card_id
        WHERE sre.session_id = $1
          AND lc.user_id = $2
        ORDER BY sre.created_at ASC
      `,
      [sessionId, currentUser.id]
    );

    return NextResponse.json({
      session: sessionResult.rows[0],
      summary: summaryResult.rows[0] ?? {
        total_reviews: 0,
        known_count: 0,
        learning_count: 0,
        hard_count: 0,
        average_response_time_ms: 0,
      },
      reviewedWords: reviewedWordsResult.rows ?? [],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Session summary error:", error);

    return NextResponse.json(
      { error: "Failed to load session summary." },
      { status: 500 }
    );
  }
}