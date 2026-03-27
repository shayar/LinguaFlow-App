import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";
import { getContentSourceIdByName } from "@/lib/content-sources";

type GeneratedCard = {
  targetWord: string;
  translation: string;
  pronunciation?: string | null;
  exampleSentence?: string | null;
  exampleTranslationNative?: string | null;
  glossItems?: Array<{
    token: string;
    gloss: string;
    isTarget: boolean;
  }> | null;
  explanation?: string | null;
  metadata?: Record<string, unknown> | null;
};

type CreateDeckFromAiBody = {
  title?: string;
  language?: string;
  difficultyLevel?: string;
  category?: string;
  sourceText: string;
  nativeLanguage?: string;
  learnerLevel?: string;
  visibility?: "private" | "assigned" | "community" | "public_internal";
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: CreateDeckFromAiBody = await request.json();

    const {
      title,
      language,
      difficultyLevel,
      category,
      sourceText,
      nativeLanguage,
      learnerLevel,
      visibility = "private",
    } = body;

    if (!sourceText || !language) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const aiResponse = await fetch(
      `${process.env.AI_SERVICE_URL}/generate-deck-from-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_text: sourceText,
          target_language: language,
          native_language: nativeLanguage ?? "English",
          learner_level: learnerLevel ?? difficultyLevel ?? "Beginner",
          source_type: "ai_text_generation",
        }),
      }
    );

    const aiResult = await aiResponse.json();

    if (!aiResponse.ok) {
      return NextResponse.json(
        { error: aiResult.detail || "Failed to generate AI deck." },
        { status: aiResponse.status }
      );
    }

    const cards: GeneratedCard[] = aiResult.cards ?? [];
    if (cards.length === 0) {
      return NextResponse.json(
        { error: "No cards were generated." },
        { status: 400 }
      );
    }

    const aiSourceId = await getContentSourceIdByName("AI Generated Content");
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const insertedDeckResult = await client.query(
        `
          INSERT INTO decks (
            title,
            language,
            source_type,
            difficulty_level,
            category,
            source_id,
            quality_score,
            owner_user_id,
            visibility,
            deck_origin,
            metadata_json
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
          RETURNING id
        `,
        [
          title ?? aiResult.title ?? `${language} AI Deck`,
          language,
          "ai_generated",
          difficultyLevel ?? aiResult.difficultyLevel ?? learnerLevel ?? "Beginner",
          category ?? aiResult.category ?? "generated-from-text",
          aiSourceId,
          85,
          currentUser.id,
          visibility,
          "ai_generated",
          JSON.stringify({
            providerUsed: aiResult.provider_used ?? null,
            candidateCount: aiResult.candidate_count ?? null,
            sourceSentenceCount: aiResult.source_sentence_count ?? null,
          }),
        ]
      );

      const deckId = insertedDeckResult.rows[0].id as string;

      for (const card of cards) {
        const insertedCard = await client.query(
          `
            INSERT INTO cards (
              deck_id,
              target_word,
              translation,
              pronunciation,
              example_sentence,
              example_translation_native,
              explanation,
              gloss_items_json,
              metadata_json
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)
            RETURNING id
          `,
          [
            deckId,
            card.targetWord,
            card.translation,
            card.pronunciation ?? null,
            card.exampleSentence ?? null,
            card.exampleTranslationNative ?? null,
            card.explanation ?? null,
            JSON.stringify(card.glossItems ?? []),
            JSON.stringify(card.metadata ?? {}),
          ]
        );

        await client.query(
          `
            INSERT INTO learner_cards (
              user_id,
              card_id,
              bucket,
              mastery_score,
              streak_count
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id, card_id) DO NOTHING
          `,
          [currentUser.id, insertedCard.rows[0].id, "learning", 0, 0]
        );
      }

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: "AI deck created successfully.",
          deckId,
          cardCount: cards.length,
        },
        { status: 201 }
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Create deck from AI error:", error);

    return NextResponse.json(
      { error: "Failed to create AI deck." },
      { status: 500 }
    );
  }
}