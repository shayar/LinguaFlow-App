import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const result = await db.query(
      `
        SELECT
          da.id AS assignment_id,
          da.assignment_status,
          da.due_at,
          da.created_at AS assigned_at,
          d.id,
          d.title,
          d.language,
          d.difficulty_level,
          d.category,
          d.source_type,
          d.quality_score,
          d.visibility,
          d.deck_origin,
          owner.full_name AS owner_name,
          COUNT(DISTINCT c.id)::int AS card_count,
          COUNT(DISTINCT lc.id)::int AS learner_card_count,
          COALESCE(AVG(lc.mastery_score), 0)::float AS avg_mastery_score
        FROM deck_assignments da
        INNER JOIN decks d ON d.id = da.deck_id
        LEFT JOIN users owner ON owner.id = d.owner_user_id
        LEFT JOIN cards c ON c.deck_id = d.id
        LEFT JOIN learner_cards lc
          ON lc.card_id = c.id
         AND lc.user_id = da.assigned_to_user_id
        WHERE da.assigned_to_user_id = $1
          AND da.assignment_status = 'active'
        GROUP BY
          da.id,
          da.assignment_status,
          da.due_at,
          da.created_at,
          d.id,
          d.title,
          d.language,
          d.difficulty_level,
          d.category,
          d.source_type,
          d.quality_score,
          d.visibility,
          d.deck_origin,
          owner.full_name
        ORDER BY da.created_at DESC
      `,
      [currentUser.id]
    );

    return NextResponse.json({
      decks: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Assigned decks API error:", error);

    return NextResponse.json(
      { error: "Failed to load assigned decks." },
      { status: 500 }
    );
  }
}