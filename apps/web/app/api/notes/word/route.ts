import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type WordNoteBody = {
  learnerCardId: string;
  title?: string;
  content?: string;
};

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const { searchParams } = new URL(request.url);
    const learnerCardId = searchParams.get("learnerCardId");

    if (!learnerCardId) {
      return NextResponse.json(
        { error: "learnerCardId is required" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
        SELECT
          id,
          user_id,
          learner_card_id,
          title,
          content,
          created_at,
          updated_at
        FROM learner_word_notes
        WHERE user_id = $1
          AND learner_card_id = $2
        LIMIT 1
      `,
      [currentUser.id, learnerCardId]
    );

    return NextResponse.json({
      note: result.rows[0] ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Word note GET error:", error);

    return NextResponse.json(
      { error: "Failed to load word note" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: WordNoteBody = await request.json();

    const { learnerCardId, title, content } = body;

    if (!learnerCardId) {
      return NextResponse.json(
        { error: "learnerCardId is required" },
        { status: 400 }
      );
    }

    const ownershipCheck = await db.query(
      `
        SELECT id
        FROM learner_cards
        WHERE id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [learnerCardId, currentUser.id]
    );

    if (ownershipCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Learner card not found" },
        { status: 404 }
      );
    }

    const result = await db.query(
      `
        INSERT INTO learner_word_notes (
          user_id,
          learner_card_id,
          title,
          content
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, learner_card_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          updated_at = NOW()
        RETURNING
          id,
          user_id,
          learner_card_id,
          title,
          content,
          created_at,
          updated_at
      `,
      [
        currentUser.id,
        learnerCardId,
        title ?? null,
        content ?? "",
      ]
    );

    return NextResponse.json({
      message: "Word note saved successfully",
      note: result.rows[0],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Word note POST error:", error);

    return NextResponse.json(
      { error: "Failed to save word note" },
      { status: 500 }
    );
  }
}