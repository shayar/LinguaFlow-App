import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
        SELECT
          re.id,
          re.session_id,
          re.user_id,
          re.learner_card_id,
          re.card_id,
          re.result,
          re.response_time_ms,
          re.bucket_after,
          re.created_at,
          c.target_word,
          c.translation
        FROM review_events re
        INNER JOIN cards c ON c.id = re.card_id
        WHERE re.user_id = $1
        ORDER BY re.created_at DESC
        LIMIT 50
      `,
      [userId]
    );

    return NextResponse.json({
      reviewEvents: result.rows,
    });
  } catch (error) {
    console.error("Fetch review history error:", error);

    return NextResponse.json(
      { error: "Failed to fetch review history" },
      { status: 500 }
    );
  }
}