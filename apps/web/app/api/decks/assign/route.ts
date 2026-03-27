import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type AssignDeckBody = {
  deckId: string;
  assignedToUserId: string;
  dueAt?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: AssignDeckBody = await request.json();

    const { deckId, assignedToUserId, dueAt } = body;

    if (!deckId || !assignedToUserId) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const actorResult = await db.query(
      `
        SELECT role
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [currentUser.id]
    );

    const actorRole = actorResult.rows[0]?.role ?? "learner";
    if (!["teacher", "community_manager"].includes(actorRole)) {
      return NextResponse.json(
        { error: "You do not have permission to assign decks." },
        { status: 403 }
      );
    }

    const deckResult = await db.query(
      `
        SELECT id, owner_user_id, visibility
        FROM decks
        WHERE id = $1
        LIMIT 1
      `,
      [deckId]
    );

    if (deckResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Deck not found." },
        { status: 404 }
      );
    }

    const deck = deckResult.rows[0];
    if (deck.owner_user_id && deck.owner_user_id !== currentUser.id && actorRole !== "community_manager") {
      return NextResponse.json(
        { error: "You do not have permission to assign this deck." },
        { status: 403 }
      );
    }

    const learnerResult = await db.query(
      `
        SELECT id
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [assignedToUserId]
    );

    if (learnerResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Target user not found." },
        { status: 404 }
      );
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
          INSERT INTO deck_assignments (
            deck_id,
            assigned_by_user_id,
            assigned_to_user_id,
            assignment_status,
            due_at
          )
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (deck_id, assigned_to_user_id)
          DO UPDATE SET
            assigned_by_user_id = EXCLUDED.assigned_by_user_id,
            assignment_status = 'active',
            due_at = EXCLUDED.due_at,
            updated_at = NOW()
        `,
        [deckId, currentUser.id, assignedToUserId, "active", dueAt ?? null]
      );

      const cardRows = await client.query(
        `
          SELECT id
          FROM cards
          WHERE deck_id = $1
        `,
        [deckId]
      );

      for (const row of cardRows.rows) {
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
          [assignedToUserId, row.id, "learning", 0, 0]
        );
      }

      await client.query("COMMIT");

      return NextResponse.json({
        message: "Deck assigned successfully.",
        deckId,
        assignedToUserId,
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

    console.error("Assign deck API error:", error);

    return NextResponse.json(
      { error: "Failed to assign deck." },
      { status: 500 }
    );
  }
}