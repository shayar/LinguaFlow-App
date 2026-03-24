import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type RouteContext = {
  params: Promise<{
    learnerCardId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const { learnerCardId } = await context.params;

    if (!learnerCardId) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const wordResult = await db.query(
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
          c.example_translation_native,
          c.explanation,
          c.gloss_items_json,
          c.metadata_json,
          d.id AS deck_id,
          d.title AS deck_title,
          d.language,
          d.category,
          d.source_type,
          cs.source_name,
          cs.provider,
          cs.license_label,
          cs.source_url
        FROM learner_cards lc
        INNER JOIN cards c ON c.id = lc.card_id
        INNER JOIN decks d ON d.id = c.deck_id
        LEFT JOIN content_sources cs ON cs.id = d.source_id
        WHERE lc.id = $1
          AND lc.user_id = $2
        LIMIT 1
      `,
      [learnerCardId, currentUser.id]
    );

    if (wordResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Word not found." },
        { status: 404 }
      );
    }

    const noteResult = await db.query(
      `
        SELECT
          id,
          title,
          content,
          created_at,
          updated_at
        FROM learner_word_notes
        WHERE user_id = $1
          AND learner_card_id = $2
        LIMIT 1
      `,
      [currentUser.id, learnerCardId]
    );

    const historyResult = await db.query(
      `
        SELECT
          sre.id,
          sre.result,
          sre.bucket_after,
          sre.response_time_ms,
          sre.created_at
        FROM study_review_events sre
        WHERE sre.learner_card_id = $1
        ORDER BY sre.created_at DESC
        LIMIT 20
      `,
      [learnerCardId]
    );

    return NextResponse.json({
      word: wordResult.rows[0],
      note: noteResult.rows[0] ?? null,
      history: historyResult.rows ?? [],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Word detail API error:", error);

    return NextResponse.json(
      { error: "Failed to load word details." },
      { status: 500 }
    );
  }
}