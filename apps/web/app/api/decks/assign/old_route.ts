import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const STARTER_DECK = {
  title: "Spanish Starter Basics",
  language: "Spanish",
  difficultyLevel: "Beginner",
  cards: [
    {
      targetWord: "hola",
      translation: "hello",
      pronunciation: "OH-lah",
      exampleSentence: "Hola, ¿cómo estás?",
      explanation: "A common greeting used to say hello.",
      metadata: {
        partOfSpeech: "interjection",
        tags: ["greeting", "beginner"],
      },
    },
    {
      targetWord: "gracias",
      translation: "thank you",
      pronunciation: "GRAH-see-ahs",
      exampleSentence: "Gracias por tu ayuda.",
      explanation: "Used to thank someone.",
      metadata: {
        partOfSpeech: "expression",
        tags: ["politeness", "beginner"],
      },
    },
    {
      targetWord: "agua",
      translation: "water",
      pronunciation: "AH-gwah",
      exampleSentence: "Necesito agua.",
      explanation: "The Spanish word for water.",
      metadata: {
        partOfSpeech: "noun",
        tags: ["daily-life", "beginner"],
      },
    },
    {
      targetWord: "amigo",
      translation: "friend",
      pronunciation: "ah-MEE-goh",
      exampleSentence: "Él es mi amigo.",
      explanation: "A male friend or a general friend in simple usage.",
      metadata: {
        partOfSpeech: "noun",
        tags: ["people", "beginner"],
      },
    },
    {
      targetWord: "comer",
      translation: "to eat",
      pronunciation: "koh-MEHR",
      exampleSentence: "Me gusta comer pizza.",
      explanation: "A common verb meaning to eat.",
      metadata: {
        partOfSpeech: "verb",
        tags: ["verb", "daily-life"],
      },
    },
  ],
};

export async function POST() {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existingDeck = await client.query(
      `
        SELECT id
        FROM decks
        WHERE title = $1 AND language = $2
        LIMIT 1
      `,
      [STARTER_DECK.title, STARTER_DECK.language]
    );

    if (existingDeck.rows.length > 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          message: "Starter deck already exists",
          deckId: existingDeck.rows[0].id,
        },
        { status: 200 }
      );
    }

    const insertedDeck = await client.query(
      `
        INSERT INTO decks (title, language, source_type, difficulty_level)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, language, source_type, difficulty_level, created_at
      `,
      [
        STARTER_DECK.title,
        STARTER_DECK.language,
        "internal",
        STARTER_DECK.difficultyLevel,
      ]
    );

    const deck = insertedDeck.rows[0];

    const insertedCards = [];

    for (const card of STARTER_DECK.cards) {
      const insertedCard = await client.query(
        `
          INSERT INTO cards (
            deck_id,
            target_word,
            translation,
            pronunciation,
            example_sentence,
            explanation,
            metadata_json
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
          RETURNING id, target_word, translation, pronunciation, example_sentence, explanation, metadata_json
        `,
        [
          deck.id,
          card.targetWord,
          card.translation,
          card.pronunciation,
          card.exampleSentence,
          card.explanation,
          JSON.stringify(card.metadata),
        ]
      );

      insertedCards.push(insertedCard.rows[0]);
    }

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Starter deck seeded successfully",
        deck,
        cards: insertedCards,
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed deck error:", error);

    return NextResponse.json(
      { error: "Failed to seed starter deck" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}