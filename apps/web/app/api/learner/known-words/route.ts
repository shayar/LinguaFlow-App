import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const result = await db.query(
      `
        SELECT
          id,
          language,
          word,
          source_card_id,
          confidence_score,
          created_at
        FROM known_words
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [currentUser.id]
    );

    return NextResponse.json({
      knownWords: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Known words API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch known words" },
      { status: 500 }
    );
  }
}