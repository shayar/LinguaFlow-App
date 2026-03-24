import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";
import { getContentSourceIdByName } from "@/lib/content-sources";

type CardInput = {
  targetWord: string;
  translation: string;
  pronunciation?: string | null;
  exampleSentence?: string | null;
  exampleTranslationNative?: string | null;
  glossItems?: Array<{
    token: string;
    gloss: string;
    isTarget: boolean;
  }>;
  explanation?: string | null;
  metadata?: Record<string, unknown>;
};

type CreateDeckBody = {
  title: string;
  language: string;
  difficultyLevel?: string;
  category?: string;
  cards: CardInput[];
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: CreateDeckBody = await request.json();

    const {
      title,
      language,
      difficultyLevel = "Beginner",
      category = "generated-from-text",
      cards,
    } = body;

    if (!title || !language || !cards || cards.length === 0) {
      return NextResponse.json(
        { error: "Missing required information." },
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
            metadata_json
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
          RETURNING id
        `,
        [
          title,
          language,
          "ai_generated",
          difficultyLevel,
          category,
          aiSourceId,
          70,
          JSON.stringify({
            sourceLabel: "AI Generated Content",
            generationMode: "ai-builder",
          }),
        ]
      );

      const deckId = insertedDeckResult.rows[0].id;

      const insertedCardIds: string[] = [];

      for (const card of cards) {
        const cardResult = await client.query(
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

        insertedCardIds.push(cardResult.rows[0].id);
      }

      let assignedCount = 0;

      for (const cardId of insertedCardIds) {
        const assignResult = await client.query(
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
            RETURNING id
          `,
          [currentUser.id, cardId, "learning", 0, 0]
        );

        if (assignResult.rowCount && assignResult.rowCount > 0) {
          assignedCount += 1;
        }
      }

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: "AI deck created successfully",
          deckId,
          assignedCount,
        },
        { status: 201 }
      );
    } catch (transactionError) {
      await client.query("ROLLBACK");
      throw transactionError;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Create AI deck API error:", error);

    return NextResponse.json(
      { error: "Failed to create AI deck" },
      { status: 500 }
    );
  }
}