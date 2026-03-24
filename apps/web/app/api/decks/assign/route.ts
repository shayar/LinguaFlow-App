import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type AssignDeckRequestBody = {
  userId: string;
  deckId: string;
};

export async function POST(request: NextRequest) {
  try {
    const body: AssignDeckRequestBody = await request.json();
    const { userId, deckId } = body;

    if (!userId || !deckId) {
      return NextResponse.json(
        { error: "userId and deckId are required" },
        { status: 400 }
      );
    }

    const userCheck = await db.query(
      `SELECT id FROM users WHERE id = $1`,
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const deckCheck = await db.query(
      `SELECT id FROM decks WHERE id = $1`,
      [deckId]
    );

    if (deckCheck.rows.length === 0) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const cardsResult = await client.query(
        `
          SELECT id
          FROM cards
          WHERE deck_id = $1
        `,
        [deckId]
      );

      let assignedCount = 0;
      let skippedCount = 0;

      for (const row of cardsResult.rows) {
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
          [userId, row.id, "learning", 0, 0]
        );

        if (insertResult.rowCount && insertResult.rowCount > 0) {
          assignedCount += 1;
        } else {
          skippedCount += 1;
        }
      }

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: "Deck assignment processed successfully",
          assignedCount,
          skippedCount,
          totalCardsInDeck: cardsResult.rows.length,
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
    console.error("Assign deck error:", error);

    return NextResponse.json(
      { error: "Failed to assign deck" },
      { status: 500 }
    );
  }
}