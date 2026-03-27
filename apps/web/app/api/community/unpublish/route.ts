import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type UnpublishDeckBody = {
  deckId: string;
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: UnpublishDeckBody = await request.json();

    const { deckId } = body;

    if (!deckId) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
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

    if (deck.owner_user_id !== currentUser.id) {
      return NextResponse.json(
        { error: "You do not own this deck." },
        { status: 403 }
      );
    }

    if (deck.visibility !== "community") {
      return NextResponse.json(
        { error: "This deck is not currently published to community." },
        { status: 400 }
      );
    }

    await db.query(
      `
        UPDATE decks
        SET visibility = 'private'
        WHERE id = $1
          AND owner_user_id = $2
      `,
      [deckId, currentUser.id]
    );

    return NextResponse.json({
      message: "Deck removed from community.",
      deckId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Unpublish community deck API error:", error);

    return NextResponse.json(
      { error: "Failed to unpublish deck." },
      { status: 500 }
    );
  }
}