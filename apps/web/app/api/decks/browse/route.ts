import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET() {
  try {
    await requireAuthenticatedUserForApi();

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
          COUNT(c.id)::int AS card_count
        FROM decks d
        LEFT JOIN content_sources cs ON cs.id = d.source_id
        LEFT JOIN cards c ON c.deck_id = d.id
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
          d.quality_score DESC NULLS LAST,
          d.created_at DESC
        LIMIT 50
      `
    );

    return NextResponse.json({
      decks: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Deck browse API error:", error);

    return NextResponse.json(
      { error: "Failed to browse decks" },
      { status: 500 }
    );
  }
}