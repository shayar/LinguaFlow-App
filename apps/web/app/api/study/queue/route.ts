import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";
import { getContentSourceIdByName } from "@/lib/content-sources";

type QueueRow = {
  learner_card_id: string;
  bucket: string;
  mastery_score: number;
  streak_count: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  target_word: string;
  translation: string;
  pronunciation: string | null;
  example_sentence: string | null;
  example_translation_native: string | null;
  explanation: string | null;
  gloss_items_json: Array<{
    token: string;
    gloss: string;
    isTarget: boolean;
  }> | null;
  deck_title: string;
  language: string;
};

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
      {
        targetWord: "casa",
        translation: "house",
        pronunciation: "KAH-sah",
        exampleSentence: "Mi casa es pequeña.",
        explanation: "A common word for house.",
      },
      {
        targetWord: "comer",
        translation: "to eat",
        pronunciation: "ko-MEHR",
        exampleSentence: "Quiero comer ahora.",
        explanation: "A common verb for eating.",
      },
      {
        targetWord: "amigo",
        translation: "friend",
        pronunciation: "ah-MEE-go",
        exampleSentence: "Él es mi amigo.",
        explanation: "A common noun for friend.",
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
      {
        targetWord: "house",
        translation: "house",
        pronunciation: "hous",
        exampleSentence: "This is my house.",
        explanation: "A common noun for where you live.",
      },
      {
        targetWord: "eat",
        translation: "to eat",
        pronunciation: "eet",
        exampleSentence: "We eat together.",
        explanation: "A basic everyday verb.",
      },
      {
        targetWord: "book",
        translation: "book",
        pronunciation: "buk",
        exampleSentence: "I have a book.",
        explanation: "A basic noun for reading material.",
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
      {
        targetWord: "घर",
        translation: "house",
        pronunciation: "ghar",
        exampleSentence: "यो मेरो घर हो।",
        explanation: "A common word for house.",
      },
      {
        targetWord: "खानु",
        translation: "to eat",
        pronunciation: "kha-nu",
        exampleSentence: "म खाना खानु चाहन्छु।",
        explanation: "A common verb for eating.",
      },
      {
        targetWord: "साथी",
        translation: "friend",
        pronunciation: "saa-thi",
        exampleSentence: "ऊ मेरो साथी हो।",
        explanation: "A common noun for friend.",
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
      {
        targetWord: "maison",
        translation: "house",
        pronunciation: "meh-ZON",
        exampleSentence: "Ma maison est ici.",
        explanation: "A common noun for house.",
      },
      {
        targetWord: "manger",
        translation: "to eat",
        pronunciation: "mahn-ZHAY",
        exampleSentence: "Je vais manger maintenant.",
        explanation: "A basic verb for eating.",
      },
      {
        targetWord: "ami",
        translation: "friend",
        pronunciation: "ah-MEE",
        exampleSentence: "Il est mon ami.",
        explanation: "A common noun for friend.",
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
  translation: string,
  nativeLanguage: string | null
) {
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

async function ensureLearnerHasStarterCards(userId: string) {
  const learnerCardCountResult = await db.query(
    `
      SELECT COUNT(*)::int AS count
      FROM learner_cards
      WHERE user_id = $1
    `,
    [userId]
  );

  const learnerCardCount = learnerCardCountResult.rows[0]?.count ?? 0;
  if (learnerCardCount > 0) {
    return false;
  }

  const profileResult = await db.query(
    `
      SELECT target_language, verified_level, self_reported_level, native_language
      FROM learner_profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  if (profileResult.rows.length === 0) {
    return false;
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
            generationMode: "auto-starter",
          }),
        ]
      );

      deckId = insertedDeckResult.rows[0].id;

      for (const card of starterDeck.cards) {
        const exampleSentence = card.exampleSentence ?? card.targetWord;
        const exampleTranslationNative = buildNativeTranslation(
          exampleSentence,
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

    for (const row of deckCardsResult.rows) {
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
        [userId, row.id, "learning", 0, 0]
      );
    }

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function bucketPriority(bucket: string) {
  if (bucket === "hard") return 1;
  if (bucket === "learning") return 2;
  if (bucket === "known") return 3;
  return 4;
}

function minutesSince(dateString: string | null) {
  if (!dateString) return Number.POSITIVE_INFINITY;
  const diffMs = Date.now() - new Date(dateString).getTime();
  return diffMs / (1000 * 60);
}

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const autoStarterCreated = await ensureLearnerHasStarterCards(currentUser.id);

    const profileResult = await db.query(
      `
        SELECT
          target_language,
          verified_level,
          self_reported_level
        FROM learner_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [currentUser.id]
    );

    const learnerProfile = profileResult.rows[0] ?? null;
    const learnerLevel =
      learnerProfile?.verified_level ??
      learnerProfile?.self_reported_level ??
      "Beginner";

    const queueResult = await db.query(
      `
        SELECT
          lc.id AS learner_card_id,
          lc.bucket,
          lc.mastery_score,
          lc.streak_count,
          lc.next_review_at,
          lc.last_reviewed_at,
          c.target_word,
          c.translation,
          c.pronunciation,
          c.example_sentence,
          c.example_translation_native,
          c.explanation,
          c.gloss_items_json,
          d.title AS deck_title,
          d.language
        FROM learner_cards lc
        INNER JOIN cards c ON c.id = lc.card_id
        INNER JOIN decks d ON d.id = c.deck_id
        WHERE lc.user_id = $1
          AND (
            lc.next_review_at IS NULL
            OR lc.next_review_at <= NOW()
          )
        ORDER BY
          CASE
            WHEN lc.bucket = 'hard' THEN 1
            WHEN lc.bucket = 'learning' THEN 2
            WHEN lc.bucket = 'known' THEN 3
            ELSE 4
          END,
          lc.next_review_at ASC NULLS FIRST,
          lc.last_reviewed_at ASC NULLS FIRST,
          lc.mastery_score ASC,
          lc.created_at ASC
        LIMIT 60
      `,
      [currentUser.id]
    );

    const allDueCards: QueueRow[] = queueResult.rows;

    const rescored = allDueCards.map((card) => {
      const mins = minutesSince(card.last_reviewed_at);
      let repetitionPenalty = 0;

      if (mins < 5) repetitionPenalty = 1000;
      else if (mins < 15) repetitionPenalty = 400;
      else if (mins < 30) repetitionPenalty = 150;
      else if (mins < 60) repetitionPenalty = 50;

      return {
        ...card,
        _score:
          bucketPriority(card.bucket) * 100 +
          (card.mastery_score ?? 0) * 2 +
          repetitionPenalty -
          Math.min(card.streak_count ?? 0, 10),
      };
    });

    rescored.sort((a, b) => a._score - b._score);

    const hardCards = rescored.filter((c) => c.bucket === "hard");
    const learningCards = rescored.filter((c) => c.bucket === "learning");
    const knownCards = rescored.filter((c) => c.bucket === "known");

    const queue: QueueRow[] = [
      ...hardCards.slice(0, 4),
      ...learningCards.slice(0, 6),
      ...knownCards.slice(0, 2),
    ];

    const uniqueQueue = Array.from(
      new Map(queue.map((item) => [item.learner_card_id, item])).values()
    ).slice(0, 12);

    return NextResponse.json({
      queue: uniqueQueue,
      learnerLevel,
      autoStarterCreated,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Study queue error:", error);

    return NextResponse.json(
      { error: "Failed to load study queue." },
      { status: 500 }
    );
  }
}