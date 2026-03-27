import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

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
        { error: "You do not have permission to access teacher progress." },
        { status: 403 }
      );
    }

    const result = await db.query(
      `
        SELECT
          da.id AS assignment_id,
          da.created_at AS assigned_at,
          da.due_at,
          da.assignment_status,
          learner.id AS learner_id,
          learner.full_name AS learner_name,
          learner.email AS learner_email,
          d.id AS deck_id,
          d.title AS deck_title,
          d.language,
          COUNT(DISTINCT c.id)::int AS total_cards,
          COUNT(DISTINCT lc.id)::int AS learner_cards,
          COALESCE(SUM(CASE WHEN lc.bucket = 'known' THEN 1 ELSE 0 END), 0)::int AS known_count,
          COALESCE(SUM(CASE WHEN lc.bucket = 'learning' THEN 1 ELSE 0 END), 0)::int AS learning_count,
          COALESCE(SUM(CASE WHEN lc.bucket = 'hard' THEN 1 ELSE 0 END), 0)::int AS hard_count,
          COALESCE(AVG(lc.mastery_score), 0)::float AS avg_mastery_score,
          MAX(lc.last_reviewed_at) AS last_reviewed_at
        FROM deck_assignments da
        INNER JOIN users learner ON learner.id = da.assigned_to_user_id
        INNER JOIN decks d ON d.id = da.deck_id
        LEFT JOIN cards c ON c.deck_id = d.id
        LEFT JOIN learner_cards lc
          ON lc.card_id = c.id
         AND lc.user_id = learner.id
        WHERE da.assigned_by_user_id = $1
          AND da.assignment_status = 'active'
        GROUP BY
          da.id,
          da.created_at,
          da.due_at,
          da.assignment_status,
          learner.id,
          learner.full_name,
          learner.email,
          d.id,
          d.title,
          d.language
        ORDER BY da.created_at DESC
      `,
      [currentUser.id]
    );

    return NextResponse.json({
      assignments: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Teacher progress API error:", error);

    return NextResponse.json(
      { error: "Failed to load teacher progress." },
      { status: 500 }
    );
  }
}