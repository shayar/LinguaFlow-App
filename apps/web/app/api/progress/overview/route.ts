import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const [bucketResult, decksResult, sessionsResult, recentSessionsResult] =
      await Promise.all([
        db.query(
          `
            SELECT
              COALESCE(SUM(CASE WHEN bucket = 'known' THEN 1 ELSE 0 END), 0)::int AS known_count,
              COALESCE(SUM(CASE WHEN bucket = 'learning' THEN 1 ELSE 0 END), 0)::int AS learning_count,
              COALESCE(SUM(CASE WHEN bucket = 'hard' THEN 1 ELSE 0 END), 0)::int AS hard_count,
              COUNT(*)::int AS total_cards
            FROM learner_cards
            WHERE user_id = $1
          `,
          [currentUser.id]
        ),
        db.query(
          `
            SELECT COUNT(*)::int AS deck_count
            FROM decks
            WHERE owner_user_id = $1
          `,
          [currentUser.id]
        ),
        db.query(
          `
            SELECT COUNT(*)::int AS session_count
            FROM study_sessions
            WHERE user_id = $1
          `,
          [currentUser.id]
        ),
        db.query(
          `
            SELECT
              id,
              started_at,
              ended_at,
              session_type
            FROM study_sessions
            WHERE user_id = $1
            ORDER BY started_at DESC
            LIMIT 5
          `,
          [currentUser.id]
        ),
      ]);

    return NextResponse.json({
      buckets: bucketResult.rows[0],
      decks: decksResult.rows[0],
      sessions: sessionsResult.rows[0],
      recentSessions: recentSessionsResult.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Progress overview error:", error);

    return NextResponse.json(
      { error: "Failed to load progress overview." },
      { status: 500 }
    );
  }
}