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
      { targetWord: "hola", translation: "hello", pronunciation: "OH-lah", exampleSentence: "Hola, ¿cómo estás?", explanation: "A common greeting." },
      { targetWord: "gracias", translation: "thank you", pronunciation: "GRAH-see-ahs", exampleSentence: "Gracias por tu ayuda.", explanation: "Used to thank someone." },
      { targetWord: "agua", translation: "water", pronunciation: "AH-gwah", exampleSentence: "Necesito agua.", explanation: "A common everyday word." },
      { targetWord: "casa", translation: "house", pronunciation: "KAH-sah", exampleSentence: "Mi casa es pequeña.", explanation: "A common noun for house." },
      { targetWord: "comer", translation: "to eat", pronunciation: "ko-MEHR", exampleSentence: "Quiero comer ahora.", explanation: "A basic verb." },
      { targetWord: "amigo", translation: "friend", pronunciation: "ah-MEE-go", exampleSentence: "Él es mi amigo.", explanation: "A common noun for friend." },
    ],
  },
  "French:Beginner": {
    title: "French Starter Basics",
    language: "French",
    difficultyLevel: "Beginner",
    category: "starter-basics",
    cards: [
      { targetWord: "bonjour", translation: "hello", pronunciation: "bon-ZHOOR", exampleSentence: "Bonjour, comment ça va ?", explanation: "A common greeting." },
      { targetWord: "merci", translation: "thank you", pronunciation: "mehr-SEE", exampleSentence: "Merci pour ton aide.", explanation: "Used to thank someone." },
      { targetWord: "eau", translation: "water", pronunciation: "oh", exampleSentence: "Je veux de l'eau.", explanation: "A common everyday word." },
      { targetWord: "maison", translation: "house", pronunciation: "meh-ZON", exampleSentence: "Ma maison est ici.", explanation: "A common noun for house." },
      { targetWord: "manger", translation: "to eat", pronunciation: "mahn-ZHAY", exampleSentence: "Je vais manger maintenant.", explanation: "A basic verb." },
      { targetWord: "ami", translation: "friend", pronunciation: "ah-MEE", exampleSentence: "Il est mon ami.", explanation: "A common noun for friend." },
    ],
  },
  "Nepali:Beginner": {
    title: "Nepali Starter Basics",
    language: "Nepali",
    difficultyLevel: "Beginner",
    category: "starter-basics",
    cards: [
      { targetWord: "नमस्ते", translation: "hello", pronunciation: "na-mas-te", exampleSentence: "नमस्ते, तपाईंलाई कस्तो छ?", explanation: "A common greeting." },
      { targetWord: "धन्यवाद", translation: "thank you", pronunciation: "dha-nya-baad", exampleSentence: "तपाईंलाई धन्यवाद।", explanation: "Used to thank someone." },
      { targetWord: "पानी", translation: "water", pronunciation: "paa-ni", exampleSentence: "मलाई पानी चाहिन्छ।", explanation: "A common everyday word." },
      { targetWord: "घर", translation: "house", pronunciation: "ghar", exampleSentence: "यो मेरो घर हो।", explanation: "A common noun for house." },
      { targetWord: "खानु", translation: "to eat", pronunciation: "kha-nu", exampleSentence: "म खाना खानु चाहन्छु।", explanation: "A basic verb." },
      { targetWord: "साथी", translation: "friend", pronunciation: "saa-thi", exampleSentence: "ऊ मेरो साथी हो।", explanation: "A common noun for friend." },
    ],
  },
  "English:Beginner": {
    title: "English Starter Basics",
    language: "English",
    difficultyLevel: "Beginner",
    category: "starter-basics",
    cards: [
      { targetWord: "hello", translation: "hello", pronunciation: "heh-LOH", exampleSentence: "Hello, how are you?", explanation: "A common greeting." },
      { targetWord: "water", translation: "water", pronunciation: "WAW-ter", exampleSentence: "I need water.", explanation: "A common everyday word." },
      { targetWord: "house", translation: "house", pronunciation: "hous", exampleSentence: "This is my house.", explanation: "A common noun for house." },
      { targetWord: "friend", translation: "friend", pronunciation: "frend", exampleSentence: "She is my friend.", explanation: "A common noun for friend." },
      { targetWord: "eat", translation: "to eat", pronunciation: "eet", exampleSentence: "We eat together.", explanation: "A basic verb." },
      { targetWord: "book", translation: "book", pronunciation: "buk", exampleSentence: "I have a book.", explanation: "A common noun for reading." },
    ],
  },
};

function normalizeLevel(level: string | null | undefined): string {
  if (!level) return "Beginner";
  const normalized = level.trim().toLowerCase();
  if (normalized === "advanced") return "Advanced";
  if (normalized === "intermediate") return "Intermediate";
  if (normalized === "elementary") return "Elementary";
  return "Beginner";
}

function chooseStarterDeck(targetLanguage: string, verifiedLevel: string | null, selfReportedLevel: string | null) {
  const chosenLevel = normalizeLevel(verifiedLevel ?? selfReportedLevel);
  return (
    STARTER_DECKS[`${targetLanguage}:${chosenLevel}`] ??
    STARTER_DECKS[`${targetLanguage}:Beginner`] ??
    STARTER_DECKS["English:Beginner"]
  );
}

function buildGlossItems(sentence: string, targetWord: string, translation: string) {
  const tokens = sentence.match(/[A-Za-zÀ-ÿ\u0900-\u097F']+|[.,!?;:¿¡]/g) ?? [];
  return tokens.map((token) => ({
    token,
    gloss: token.toLowerCase() === targetWord.toLowerCase() ? translation : "",
    isTarget: token.toLowerCase() === targetWord.toLowerCase(),
  }));
}

function buildNativeMeaning(sentence: string, translation: string, nativeLanguage: string | null) {
  return `${sentence} [${nativeLanguage ?? "English"} meaning: ${translation}]`;
}

export async function POST() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const profileResult = await db.query(
      `
        SELECT
          native_language,
          target_language,
          verified_level,
          self_reported_level
        FROM learner_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [currentUser.id]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Learner profile not found." },
        { status: 404 }
      );
    }

    const profile = profileResult.rows[0];
    const starterDeck = chooseStarterDeck(
      profile.target_language,
      profile.verified_level,
      profile.self_reported_level
    );

    const starterSourceId = await getContentSourceIdByName("Internal Starter Decks");
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const existingDeckResult = await client.query(
        `
          SELECT id
          FROM decks
          WHERE title = $1
            AND language = $2
            AND owner_user_id = $3
          LIMIT 1
        `,
        [starterDeck.title, starterDeck.language, currentUser.id]
      );

      let deckId: string;

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
              owner_user_id,
              visibility,
              deck_origin,
              metadata_json
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
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
            currentUser.id,
            "private",
            "starter",
            JSON.stringify({
              sourceLabel: "Internal Starter Decks",
              setupMode: "first_run",
            }),
          ]
        );

        deckId = insertedDeckResult.rows[0].id;

        for (const card of starterDeck.cards) {
          const exampleSentence = card.exampleSentence ?? card.targetWord;

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
              exampleSentence,
              buildNativeMeaning(exampleSentence, card.translation, profile.native_language),
              card.explanation ?? null,
              JSON.stringify(buildGlossItems(exampleSentence, card.targetWord, card.translation)),
              JSON.stringify({}),
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
      }

      await client.query("COMMIT");

      const assignedCountResult = await db.query(
        `
          SELECT COUNT(*)::int AS count
          FROM learner_cards lc
          INNER JOIN cards c ON c.id = lc.card_id
          WHERE lc.user_id = $1
            AND c.deck_id = $2
        `,
        [currentUser.id, deckId]
      );

      return NextResponse.json({
        message: "Starter deck set up successfully.",
        deckId,
        assignedCount: assignedCountResult.rows[0]?.count ?? 0,
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

    console.error("First run setup deck error:", error);

    return NextResponse.json(
      { error: "Failed to set up starter deck." },
      { status: 500 }
    );
  }
}