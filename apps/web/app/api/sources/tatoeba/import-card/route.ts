import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type ImportCardBody = {
  deckId?: string | null;
  sentenceText: string;
  sentenceLanguage: string;
  targetWord: string;
  translation: string;
  learnerLevel?: string | null;
  nativeLanguage?: string | null;
};

async function ensureTatoebaSourceId() {
  const existing = await db.query(
    `
      SELECT id
      FROM content_sources
      WHERE source_name = 'Tatoeba'
      LIMIT 1
    `
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id as string;
  }

  const inserted = await db.query(
    `
      INSERT INTO content_sources (
        source_type,
        source_name,
        provider,
        source_url,
        license_label,
        quality_score,
        metadata_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING id
    `,
    [
      "sentence_source",
      "Tatoeba",
      "tatoeba",
      "https://tatoeba.org",
      "Tatoeba license",
      80,
      JSON.stringify({
        description: "Sentence imports from Tatoeba",
      }),
    ]
  );

  return inserted.rows[0].id as string;
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: ImportCardBody = await request.json();

    const {
      deckId,
      sentenceText,
      sentenceLanguage,
      targetWord,
      translation,
      learnerLevel,
      nativeLanguage,
    } = body;

    if (!sentenceText || !sentenceLanguage || !targetWord || !translation) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const tatoebaSourceId = await ensureTatoebaSourceId();

    let finalDeckId = deckId ?? null;
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      if (!finalDeckId) {
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
            `${sentenceLanguage} Tatoeba Imports`,
            sentenceLanguage,
            "external_source",
            learnerLevel ?? "Beginner",
            "tatoeba-import",
            tatoebaSourceId,
            80,
            currentUser.id,
            "private",
            "imported",
            JSON.stringify({
              provider: "tatoeba",
            }),
          ]
        );

        finalDeckId = insertedDeck.rows[0].id;
      }

      const checkedResponse = await fetch(
        `${process.env.AI_SERVICE_URL}/generate-checked-example`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target_word: targetWord,
            translation,
            target_language: sentenceLanguage,
            learner_level: learnerLevel ?? "Beginner",
            native_language: nativeLanguage ?? "English",
            user_id: currentUser.id,
          }),
        }
      );

      const checkedResult = await checkedResponse.json();

      if (!checkedResponse.ok) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: checkedResult.detail || "Failed to generate checked example." },
          { status: checkedResponse.status }
        );
      }

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
          finalDeckId,
          targetWord,
          translation,
          null,
          checkedResult.exampleSentence ?? sentenceText,
          checkedResult.exampleTranslationNative ?? translation,
          checkedResult.explanation ?? null,
          JSON.stringify([]),
          JSON.stringify({
            sourceProvider: "tatoeba",
            importedSentence: sentenceText,
            exampleMode: checkedResult.exampleMode ?? "guided_sentence",
            modeReason: checkedResult.modeReason ?? null,
            acceptedStrictly: checkedResult.acceptedStrictly ?? true,
            finalCheck: checkedResult.finalCheck ?? null,
          }),
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

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: "Card imported successfully.",
          deckId: finalDeckId,
          cardId: insertedCard.rows[0].id,
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

    console.error("Tatoeba import card API error:", error);

    return NextResponse.json(
      { error: "Failed to import card." },
      { status: 500 }
    );
  }
}