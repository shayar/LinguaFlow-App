import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type SentenceReviewBody = {
  learnerCardId?: string | null;
  targetWord: string;
  targetLanguage: string;
  learnerLevel?: string | null;
  generatedSentence: string;
  explanation?: string | null;
  advancedWordCount: number;
  advancedWords: string[];
  knownWordsMatched: string[];
  replacementsUsed: Array<{ from: string; to: string }>;
  iterationsUsed: number;
  accepted: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: SentenceReviewBody = await request.json();

    const {
      learnerCardId,
      targetWord,
      targetLanguage,
      learnerLevel,
      generatedSentence,
      explanation,
      advancedWordCount,
      advancedWords,
      knownWordsMatched,
      replacementsUsed,
      iterationsUsed,
      accepted,
    } = body;

    if (!targetWord || !targetLanguage || !generatedSentence) {
      return NextResponse.json(
        { error: "Missing required sentence review fields" },
        { status: 400 }
      );
    }

    let cardId: string | null = null;

    if (learnerCardId) {
      const learnerCardResult = await db.query(
        `
          SELECT lc.card_id
          FROM learner_cards lc
          WHERE lc.id = $1 AND lc.user_id = $2
          LIMIT 1
        `,
        [learnerCardId, currentUser.id]
      );

      if (learnerCardResult.rows.length > 0) {
        cardId = learnerCardResult.rows[0].card_id;
      }
    }

    const result = await db.query(
      `
        INSERT INTO sentence_reviews (
          user_id,
          learner_card_id,
          card_id,
          target_word,
          target_language,
          learner_level,
          generated_sentence,
          explanation,
          advanced_word_count,
          advanced_words_json,
          known_words_matched_json,
          replacements_used_json,
          iterations_used,
          accepted,
          review_status
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10::jsonb, $11::jsonb, $12::jsonb, $13, $14, $15
        )
        RETURNING id, created_at, review_status
      `,
      [
        currentUser.id,
        learnerCardId ?? null,
        cardId,
        targetWord,
        targetLanguage,
        learnerLevel ?? null,
        generatedSentence,
        explanation ?? null,
        advancedWordCount,
        JSON.stringify(advancedWords ?? []),
        JSON.stringify(knownWordsMatched ?? []),
        JSON.stringify(replacementsUsed ?? []),
        iterationsUsed ?? 0,
        accepted,
        accepted ? "auto_accepted" : "auto_flagged",
      ]
    );

    return NextResponse.json(
      {
        message: "Sentence review saved successfully",
        sentenceReview: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Save sentence review error:", error);

    return NextResponse.json(
      { error: "Failed to save sentence review" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const result = await db.query(
      `
        SELECT
          id,
          learner_card_id,
          card_id,
          target_word,
          target_language,
          learner_level,
          generated_sentence,
          explanation,
          advanced_word_count,
          advanced_words_json,
          known_words_matched_json,
          replacements_used_json,
          iterations_used,
          accepted,
          review_status,
          teacher_feedback,
          reviewed_by_user_id,
          reviewed_at,
          created_at
        FROM sentence_reviews
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [currentUser.id]
    );

    return NextResponse.json({
      sentenceReviews: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Fetch sentence reviews error:", error);

    return NextResponse.json(
      { error: "Failed to fetch sentence reviews" },
      { status: 500 }
    );
  }
}