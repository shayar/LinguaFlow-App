import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();

    const result = await db.query(
      `
        SELECT
          d.id,
          d.title,
          d.language,
          d.difficulty_level,
          d.category,
          d.source_type,
          d.quality_score,
          d.visibility,
          d.deck_origin,
          d.created_at,
          owner.id AS owner_user_id,
          owner.full_name AS owner_name,
          (owner.id = $2)::boolean AS is_owned_by_current_user,
          COUNT(DISTINCT c.id)::int AS card_count
        FROM decks d
        LEFT JOIN users owner ON owner.id = d.owner_user_id
        LEFT JOIN cards c ON c.deck_id = d.id
        WHERE d.visibility = 'community'
          AND (
            $1 = ''
            OR d.title ILIKE '%' || $1 || '%'
            OR COALESCE(d.language, '') ILIKE '%' || $1 || '%'
            OR COALESCE(d.category, '') ILIKE '%' || $1 || '%'
            OR COALESCE(owner.full_name, '') ILIKE '%' || $1 || '%'
          )
        GROUP BY
          d.id,
          d.title,
          d.language,
          d.difficulty_level,
          d.category,
          d.source_type,
          d.quality_score,
          d.visibility,
          d.deck_origin,
          d.created_at,
          owner.id,
          owner.full_name
        ORDER BY
          d.quality_score DESC NULLS LAST,
          d.created_at DESC
        LIMIT 50
      `,
      [q, currentUser.id]
    );

    return NextResponse.json({
      decks: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Community decks API error:", error);

    return NextResponse.json(
      { error: "Failed to load community decks." },
      { status: 500 }
    );
  }
}