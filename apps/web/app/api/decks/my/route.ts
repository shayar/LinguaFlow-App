import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const result = await db.query(
      `
        SELECT
          d.id,
          d.title,
          d.language,
          d.difficulty_level,
          d.category,
          d.source_type,
          d.quality_score,
          cs.source_name,
          cs.provider,
          COUNT(DISTINCT c.id)::int AS card_count,
          COUNT(DISTINCT lc.id)::int AS learner_card_count,
          COALESCE(AVG(lc.mastery_score), 0)::float AS avg_mastery_score,
          MAX(lc.last_reviewed_at) AS last_reviewed_at
        FROM decks d
        INNER JOIN cards c ON c.deck_id = d.id
        INNER JOIN learner_cards lc ON lc.card_id = c.id
        LEFT JOIN content_sources cs ON cs.id = d.source_id
        WHERE lc.user_id = $1
        GROUP BY
          d.id,
          d.title,
          d.language,
          d.difficulty_level,
          d.category,
          d.source_type,
          d.quality_score,
          cs.source_name,
          cs.provider
        ORDER BY
          MAX(lc.last_reviewed_at) DESC NULLS LAST,
          d.created_at DESC
      `,
      [currentUser.id]
    );

    return NextResponse.json({
      decks: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("My decks API error:", error);

    return NextResponse.json(
      { error: "Failed to load your decks." },
      { status: 500 }
    );
  }
}