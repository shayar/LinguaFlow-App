import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
        SELECT
          lc.id AS learner_card_id,
          lc.bucket,
          lc.mastery_score,
          lc.streak_count,
          lc.last_reviewed_at,
          lc.next_review_at,
          c.id AS card_id,
          c.target_word,
          c.translation,
          c.pronunciation,
          c.example_sentence,
          c.explanation,
          c.metadata_json,
          d.id AS deck_id,
          d.title AS deck_title,
          d.language,
          d.difficulty_level
        FROM learner_cards lc
        INNER JOIN cards c ON c.id = lc.card_id
        INNER JOIN decks d ON d.id = c.deck_id
        WHERE lc.user_id = $1
        ORDER BY c.created_at ASC
      `,
      [userId]
    );

    return NextResponse.json({
      cards: result.rows,
    });
  } catch (error) {
    console.error("Fetch learner cards error:", error);

    return NextResponse.json(
      { error: "Failed to fetch learner cards" },
      { status: 500 }
    );
  }
}