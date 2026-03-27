import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type PublishDeckBody = {
  deckId: string;
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: PublishDeckBody = await request.json();

    const { deckId } = body;

    if (!deckId) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const deckResult = await db.query(
      `
        SELECT id, owner_user_id, visibility, deck_origin
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

    await db.query(
      `
        UPDATE decks
        SET
          visibility = 'community'
        WHERE id = $1
      `,
      [deckId]
    );

    return NextResponse.json({
      message: "Deck published to community.",
      deckId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Publish community deck API error:", error);

    return NextResponse.json(
      { error: "Failed to publish deck." },
      { status: 500 }
    );
  }
}