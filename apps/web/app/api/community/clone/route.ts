import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type CloneDeckBody = {
  deckId: string;
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: CloneDeckBody = await request.json();

    const { deckId } = body;

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
          d.source_type,
          d.difficulty_level,
          d.category,
          d.source_id,
          d.quality_score,
          d.visibility,
          d.deck_origin,
          d.metadata_json,
          d.owner_user_id
        FROM decks d
        WHERE d.id = $1
          AND d.visibility = 'community'
        LIMIT 1
      `,
      [deckId]
    );

    if (deckResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Community deck not found." },
        { status: 404 }
      );
    }

    const sourceDeck = deckResult.rows[0];

    if (sourceDeck.owner_user_id === currentUser.id) {
      return NextResponse.json(
        { error: "You already own this deck." },
        { status: 400 }
      );
    }

    const existingCloneResult = await db.query(
      `
        SELECT id
        FROM decks
        WHERE owner_user_id = $1
          AND (
            metadata_json->>'clonedFromDeckId' = $2
            OR id = $2
          )
        LIMIT 1
      `,
      [currentUser.id, deckId]
    );

    if (existingCloneResult.rows.length > 0) {
      return NextResponse.json(
        { error: "This deck is already in your library." },
        { status: 400 }
      );
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const insertedDeck = await client.query(
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
          `${sourceDeck.title} (Copy)`,
          sourceDeck.language,
          sourceDeck.source_type,
          sourceDeck.difficulty_level,
          sourceDeck.category,
          sourceDeck.source_id,
          sourceDeck.quality_score,
          currentUser.id,
          "private",
          "community_cloned",
          JSON.stringify({
            ...(sourceDeck.metadata_json ?? {}),
            clonedFromDeckId: sourceDeck.id,
          }),
        ]
      );

      const newDeckId = insertedDeck.rows[0].id as string;

      const cardRows = await client.query(
        `
          SELECT
            id,
            target_word,
            translation,
            pronunciation,
            example_sentence,
            example_translation_native,
            explanation,
            gloss_items_json,
            metadata_json
          FROM cards
          WHERE deck_id = $1
          ORDER BY created_at ASC
        `,
        [deckId]
      );

      for (const card of cardRows.rows) {
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
            newDeckId,
            card.target_word,
            card.translation,
            card.pronunciation,
            card.example_sentence,
            card.example_translation_native,
            card.explanation,
            JSON.stringify(card.gloss_items_json ?? []),
            JSON.stringify(card.metadata_json ?? {}),
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

      return NextResponse.json({
        message: "Community deck added to your library.",
        deckId: newDeckId,
        cardCount: cardRows.rows.length,
      });
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

    console.error("Clone community deck API error:", error);

    return NextResponse.json(
      { error: "Failed to clone community deck." },
      { status: 500 }
    );
  }
}