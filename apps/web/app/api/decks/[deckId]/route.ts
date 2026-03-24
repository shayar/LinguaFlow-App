import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type RouteContext = {
  params: Promise<{
    deckId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const { deckId } = await context.params;

    if (!deckId) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const deckResult = await db.query(
      `
        SELECT
          d.id,
          d.title,
          d.language,
          d.difficulty_level,
          d.category,
          d.source_type,
          d.quality_score,
          d.source_url,
          d.metadata_json,
          cs.source_name,
          cs.provider,
          cs.license_label,
          COUNT(DISTINCT c.id)::int AS card_count,
          COUNT(DISTINCT lc.id)::int AS learner_card_count,
          COALESCE(AVG(lc.mastery_score), 0)::float AS avg_mastery_score,
          COALESCE(SUM(CASE WHEN lc.bucket = 'known' THEN 1 ELSE 0 END), 0)::int AS known_count,
          COALESCE(SUM(CASE WHEN lc.bucket = 'learning' THEN 1 ELSE 0 END), 0)::int AS learning_count,
          COALESCE(SUM(CASE WHEN lc.bucket = 'hard' THEN 1 ELSE 0 END), 0)::int AS hard_count,
          MAX(lc.last_reviewed_at) AS last_reviewed_at
        FROM decks d
        INNER JOIN cards c ON c.deck_id = d.id
        INNER JOIN learner_cards lc ON lc.card_id = c.id
        LEFT JOIN content_sources cs ON cs.id = d.source_id
        WHERE d.id = $1
          AND lc.user_id = $2
        GROUP BY
          d.id,
          d.title,
          d.language,
          d.difficulty_level,
          d.category,
          d.source_type,
          d.quality_score,
          d.source_url,
          d.metadata_json,
          cs.source_name,
          cs.provider,
          cs.license_label
        LIMIT 1
      `,
      [deckId, currentUser.id]
    );

    if (deckResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Deck not found." },
        { status: 404 }
      );
    }

    const wordsResult = await db.query(
      `
        SELECT
          c.id AS card_id,
          lc.id AS learner_card_id,
          c.target_word,
          c.translation,
          c.pronunciation,
          c.example_sentence,
          c.example_translation_native,
          c.explanation,
          lc.bucket,
          lc.mastery_score,
          lc.streak_count,
          lc.last_reviewed_at,
          lc.next_review_at
        FROM cards c
        INNER JOIN learner_cards lc ON lc.card_id = c.id
        WHERE c.deck_id = $1
          AND lc.user_id = $2
        ORDER BY
          CASE
            WHEN lc.bucket = 'hard' THEN 1
            WHEN lc.bucket = 'learning' THEN 2
            WHEN lc.bucket = 'known' THEN 3
            ELSE 4
          END,
          lc.mastery_score ASC,
          c.target_word ASC
      `,
      [deckId, currentUser.id]
    );

    return NextResponse.json({
      deck: deckResult.rows[0],
      words: wordsResult.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Deck detail API error:", error);

    return NextResponse.json(
      { error: "Failed to load deck details." },
      { status: 500 }
    );
  }
}