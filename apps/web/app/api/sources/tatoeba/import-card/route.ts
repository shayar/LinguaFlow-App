import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type ImportTatoebaCardBody = {
  targetWord: string;
  translation: string;
  language: string;
  exampleSentence: string;
  exampleTranslationNative?: string | null;
  explanation?: string | null;
  sourceSentenceId?: string | number | null;
  sourceUrl?: string | null;
  licenseLabel?: string | null;
};

async function getOrCreateTatoebaSourceId() {
  const existing = await db.query(
    `
      SELECT id
      FROM content_sources
      WHERE source_name = $1
      LIMIT 1
    `,
    ["Tatoeba"]
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
        ingestion_status,
        quality_score,
        metadata_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      RETURNING id
    `,
    [
      "sentence_source",
      "Tatoeba",
      "tatoeba",
      "https://tatoeba.org",
      "CC-BY 2.0 FR",
      "active",
      85,
      JSON.stringify({
        description: "Imported multilingual example sentences from Tatoeba",
      }),
    ]
  );

  return inserted.rows[0].id as string;
}

function buildGlossItems(
  sentence: string,
  targetWord: string,
  translation: string
) {
  const tokens = sentence.match(/[A-Za-zÀ-ÿ\u0900-\u097F']+|[.,!?;:¿¡]/g) ?? [];

  return tokens.map((token) => {
    const isTarget = token.toLowerCase() === targetWord.toLowerCase();

    return {
      token,
      gloss: isTarget ? translation : "",
      isTarget,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: ImportTatoebaCardBody = await request.json();

    const {
      targetWord,
      translation,
      language,
      exampleSentence,
      exampleTranslationNative,
      explanation,
      sourceSentenceId,
      sourceUrl,
      licenseLabel,
    } = body;

    if (!targetWord || !translation || !language || !exampleSentence) {
      return NextResponse.json(
        {
          error: "Missing required information.",
        },
        { status: 400 }
      );
    }

    const profileResult = await db.query(
      `
        SELECT
          native_language,
          verified_level,
          self_reported_level
        FROM learner_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [currentUser.id]
    );

    const profile = profileResult.rows[0] ?? {};
    const nativeLanguage = profile.native_language ?? "English";
    const learnerLevel =
      profile.verified_level ?? profile.self_reported_level ?? "Beginner";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    let finalSentence = exampleSentence;
    let finalExplanation =
      explanation ?? "Imported from Tatoeba example sentence.";
    let finalTranslationNative = exampleTranslationNative ?? null;
    let finalCheck: any = null;

    const checkedResponse = await fetch(
      `${appUrl}/api/ai/generate-checked-example`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetWord,
          translation,
          targetLanguage: language,
          learnerLevel,
        }),
      }
    );

    if (checkedResponse.ok) {
      const checkedResult = await checkedResponse.json();

      finalSentence = checkedResult.exampleSentence ?? exampleSentence;
      finalExplanation =
        checkedResult.explanation ?? finalExplanation;
      finalTranslationNative =
        checkedResult.exampleTranslationNative ?? finalTranslationNative;
      finalCheck = checkedResult.finalCheck ?? null;
    } else {
      const translateResponse = await fetch(
        `${appUrl}/api/ai/translate-sentence`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sentence: exampleSentence,
            target_language: language,
            native_language: nativeLanguage,
          }),
        }
      );

      if (translateResponse.ok) {
        const translateResult = await translateResponse.json();
        finalTranslationNative =
          translateResult.translated_sentence ?? finalTranslationNative;
      }
    }

    const sourceId = await getOrCreateTatoebaSourceId();
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const deckTitle = `${language} Source Imports`;
      let deckId: string;

      const existingDeck = await client.query(
        `
          SELECT id
          FROM decks
          WHERE title = $1
            AND language = $2
            AND source_id = $3
          LIMIT 1
        `,
        [deckTitle, language, sourceId]
      );

      if (existingDeck.rows.length > 0) {
        deckId = existingDeck.rows[0].id;
      } else {
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
              source_url,
              metadata_json
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
            RETURNING id
          `,
          [
            deckTitle,
            language,
            "external_source",
            learnerLevel,
            "sentence-import",
            sourceId,
            85,
            "https://tatoeba.org",
            JSON.stringify({
              sourceLabel: "Tatoeba",
              importMode: "single-sentence",
            }),
          ]
        );

        deckId = insertedDeck.rows[0].id;
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
          deckId,
          targetWord,
          translation,
          null,
          finalSentence,
          finalTranslationNative,
          finalExplanation,
          JSON.stringify(buildGlossItems(finalSentence, targetWord, translation)),
          JSON.stringify({
            source: "tatoeba",
            sourceSentenceId: sourceSentenceId ?? null,
            sourceUrl: sourceUrl ?? null,
            licenseLabel: licenseLabel ?? "CC-BY 2.0 FR",
            adaptedForLearner: true,
            finalCheck,
          }),
        ]
      );

      const cardId = insertedCard.rows[0].id;

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
        [currentUser.id, cardId, "learning", 0, 0]
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: "Tatoeba sentence imported successfully",
          deckId,
          cardId,
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

    console.error("Import Tatoeba card error:", error);

    return NextResponse.json(
      { error: "Failed to import Tatoeba card" },
      { status: 500 }
    );
  }
}