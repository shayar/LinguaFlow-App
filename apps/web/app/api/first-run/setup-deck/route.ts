import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";
import { getContentSourceIdByName } from "@/lib/content-sources";

type StarterCard = {
  targetWord: string;
  translation: string;
  pronunciation?: string;
  exampleSentence?: string;
  explanation?: string;
  metadata?: Record<string, unknown>;
};

type StarterDeckConfig = {
  title: string;
  language: string;
  difficultyLevel: string;
  category: string;
  cards: StarterCard[];
};

const STARTER_DECKS: Record<string, StarterDeckConfig> = {
  "Spanish:Beginner": {
    title: "Spanish Starter Basics",
    language: "Spanish",
    difficultyLevel: "Beginner",
    category: "starter-basics",
    cards: [
      {
        targetWord: "hola",
        translation: "hello",
        pronunciation: "OH-lah",
        exampleSentence: "Hola, ¿cómo estás?",
        explanation: "A common greeting used to say hello.",
      },
      {
        targetWord: "gracias",
        translation: "thank you",
        pronunciation: "GRAH-see-ahs",
        exampleSentence: "Gracias por tu ayuda.",
        explanation: "Used to thank someone.",
      },
      {
        targetWord: "agua",
        translation: "water",
        pronunciation: "AH-gwah",
        exampleSentence: "Necesito agua.",
        explanation: "The Spanish word for water.",
      },
    ],
  },

  "English:Beginner": {
    title: "English Starter Basics",
    language: "English",
    difficultyLevel: "Beginner",
    category: "starter-basics",
    cards: [
      {
        targetWord: "hello",
        translation: "hello",
        pronunciation: "heh-LOH",
        exampleSentence: "Hello, how are you?",
        explanation: "A very common way to greet someone.",
      },
      {
        targetWord: "water",
        translation: "water",
        pronunciation: "WAW-ter",
        exampleSentence: "I need water.",
        explanation: "A common everyday noun.",
      },
      {
        targetWord: "friend",
        translation: "friend",
        pronunciation: "frend",
        exampleSentence: "She is my friend.",
        explanation: "A common noun for a person close to you.",
      },
    ],
  },

  "Nepali:Beginner": {
    title: "Nepali Starter Basics",
    language: "Nepali",
    difficultyLevel: "Beginner",
    category: "starter-basics",
    cards: [
      {
        targetWord: "नमस्ते",
        translation: "hello",
        pronunciation: "na-mas-te",
        exampleSentence: "नमस्ते, तपाईंलाई कस्तो छ?",
        explanation: "A common greeting used to say hello.",
      },
      {
        targetWord: "धन्यवाद",
        translation: "thank you",
        pronunciation: "dha-nya-baad",
        exampleSentence: "तपाईंलाई धन्यवाद।",
        explanation: "Used to thank someone.",
      },
      {
        targetWord: "पानी",
        translation: "water",
        pronunciation: "paa-ni",
        exampleSentence: "मलाई पानी चाहिन्छ।",
        explanation: "The Nepali word for water.",
      },
    ],
  },

  "French:Beginner": {
    title: "French Starter Basics",
    language: "French",
    difficultyLevel: "Beginner",
    category: "starter-basics",
    cards: [
      {
        targetWord: "bonjour",
        translation: "hello",
        pronunciation: "bon-ZHOOR",
        exampleSentence: "Bonjour, comment ça va ?",
        explanation: "A common greeting used to say hello.",
      },
      {
        targetWord: "merci",
        translation: "thank you",
        pronunciation: "mehr-SEE",
        exampleSentence: "Merci pour ton aide.",
        explanation: "Used to thank someone.",
      },
      {
        targetWord: "eau",
        translation: "water",
        pronunciation: "oh",
        exampleSentence: "Je veux de l'eau.",
        explanation: "The French word for water.",
      },
    ],
  },
};

function normalizeLevel(level: string | null | undefined): string {
  if (!level) return "Beginner";

  const normalized = level.trim().toLowerCase();

  if (normalized === "beginner") return "Beginner";
  if (normalized === "elementary") return "Elementary";
  if (normalized === "intermediate") return "Intermediate";
  if (normalized === "advanced") return "Advanced";

  return "Beginner";
}

function chooseStarterDeck(
  targetLanguage: string,
  verifiedLevel: string | null,
  selfReportedLevel: string | null
): StarterDeckConfig {
  const chosenLevel = normalizeLevel(verifiedLevel ?? selfReportedLevel);
  const exactKey = `${targetLanguage}:${chosenLevel}`;
  const beginnerKey = `${targetLanguage}:Beginner`;

  return (
    STARTER_DECKS[exactKey] ??
    STARTER_DECKS[beginnerKey] ??
    STARTER_DECKS["English:Beginner"]
  );
}

function buildNativeTranslation(
  sentence: string,
  targetWord: string,
  translation: string,
  nativeLanguage: string | null
) {
  const native = (nativeLanguage ?? "English").toLowerCase();

  if (native === "english") {
    return `${sentence} [English meaning: ${translation}]`;
  }

  return `${sentence} [${nativeLanguage ?? "English"} meaning: ${translation}]`;
}

function buildGlossItems(sentence: string, targetWord: string, translation: string) {
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

export async function POST() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const profileResult = await db.query(
      `
        SELECT target_language, verified_level, self_reported_level, native_language
        FROM learner_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [currentUser.id]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Learner profile not found" },
        { status: 404 }
      );
    }

    const profile = profileResult.rows[0];
    const starterDeck = chooseStarterDeck(
      profile.target_language,
      profile.verified_level,
      profile.self_reported_level
    );

    const nativeLanguage = profile.native_language ?? "English";
    const starterSourceId = await getContentSourceIdByName("Internal Starter Decks");

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      let deckId: string;

      const existingDeckResult = await client.query(
        `
          SELECT id
          FROM decks
          WHERE title = $1 AND language = $2
          LIMIT 1
        `,
        [starterDeck.title, starterDeck.language]
      );

      if (existingDeckResult.rows.length > 0) {
        deckId = existingDeckResult.rows[0].id;
      } else {
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
            starterDeck.title,
            starterDeck.language,
            "internal",
            starterDeck.difficultyLevel,
            starterDeck.category,
            starterSourceId,
            90,
            JSON.stringify({
              sourceLabel: "Internal Starter Decks",
              generationMode: "starter-seeded",
            }),
          ]
        );

        deckId = insertedDeckResult.rows[0].id;

        for (const card of starterDeck.cards) {
          const exampleSentence = card.exampleSentence ?? `${card.targetWord}`;
          const exampleTranslationNative = buildNativeTranslation(
            exampleSentence,
            card.targetWord,
            card.translation,
            nativeLanguage
          );
          const glossItems = buildGlossItems(
            exampleSentence,
            card.targetWord,
            card.translation
          );

          await client.query(
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
            `,
            [
              deckId,
              card.targetWord,
              card.translation,
              card.pronunciation ?? null,
              exampleSentence,
              exampleTranslationNative,
              card.explanation ?? null,
              JSON.stringify(glossItems),
              JSON.stringify(card.metadata ?? {}),
            ]
          );
        }
      }

      const deckCardsResult = await client.query(
        `
          SELECT id
          FROM cards
          WHERE deck_id = $1
        `,
        [deckId]
      );

      let assignedCount = 0;

      for (const row of deckCardsResult.rows) {
        const insertResult = await client.query(
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
          [currentUser.id, row.id, "learning", 0, 0]
        );

        if (insertResult.rowCount && insertResult.rowCount > 0) {
          assignedCount += 1;
        }
      }

      await client.query("COMMIT");

      return NextResponse.json({
        message: "Starter deck setup completed",
        deckId,
        assignedCount,
        language: starterDeck.language,
        difficultyLevel: starterDeck.difficultyLevel,
        nativeLanguage,
      });
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

    console.error("First-run deck setup error:", error);

    return NextResponse.json(
      { error: "Failed to set up starter deck" },
      { status: 500 }
    );
  }
}