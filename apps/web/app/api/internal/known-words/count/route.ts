import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const language = searchParams.get("language");

    if (!userId || !language) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM known_words
        WHERE user_id = $1
          AND language = $2
      `,
      [userId, language]
    );

    return NextResponse.json({
      count: result.rows[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("Internal known words count API error:", error);

    return NextResponse.json(
      { error: "Failed to load known word count." },
      { status: 500 }
    );
  }
}