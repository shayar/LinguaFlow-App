import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const actorResult = await db.query(
      `
        SELECT role, full_name
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [currentUser.id]
    );

    const actor = actorResult.rows[0];
    if (!actor || !["teacher", "community_manager"].includes(actor.role)) {
      return NextResponse.json(
        { error: "You do not have permission to access teacher tools." },
        { status: 403 }
      );
    }

    const deckStatsResult = await db.query(
      `
        SELECT
          COUNT(*)::int AS owned_deck_count
        FROM decks
        WHERE owner_user_id = $1
      `,
      [currentUser.id]
    );

    const assignmentStatsResult = await db.query(
      `
        SELECT
          COUNT(*)::int AS active_assignment_count
        FROM deck_assignments
        WHERE assigned_by_user_id = $1
          AND assignment_status = 'active'
      `,
      [currentUser.id]
    );

    const recentAssignmentsResult = await db.query(
      `
        SELECT
          da.id AS assignment_id,
          da.created_at,
          da.due_at,
          d.id AS deck_id,
          d.title AS deck_title,
          assignee.id AS learner_id,
          assignee.full_name AS learner_name,
          assignee.email AS learner_email
        FROM deck_assignments da
        INNER JOIN decks d ON d.id = da.deck_id
        INNER JOIN users assignee ON assignee.id = da.assigned_to_user_id
        WHERE da.assigned_by_user_id = $1
          AND da.assignment_status = 'active'
        ORDER BY da.created_at DESC
        LIMIT 8
      `,
      [currentUser.id]
    );

    const ownedDecksResult = await db.query(
      `
        SELECT
          d.id,
          d.title,
          d.language,
          d.difficulty_level,
          d.deck_origin,
          d.visibility,
          COUNT(DISTINCT c.id)::int AS card_count
        FROM decks d
        LEFT JOIN cards c ON c.deck_id = d.id
        WHERE d.owner_user_id = $1
        GROUP BY
          d.id,
          d.title,
          d.language,
          d.difficulty_level,
          d.deck_origin,
          d.visibility
        ORDER BY d.created_at DESC
        LIMIT 12
      `,
      [currentUser.id]
    );

    return NextResponse.json({
      teacher: {
        fullName: actor.full_name,
        role: actor.role,
      },
      stats: {
        ownedDeckCount: deckStatsResult.rows[0]?.owned_deck_count ?? 0,
        activeAssignmentCount: assignmentStatsResult.rows[0]?.active_assignment_count ?? 0,
      },
      recentAssignments: recentAssignmentsResult.rows,
      ownedDecks: ownedDecksResult.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Teacher dashboard API error:", error);

    return NextResponse.json(
      { error: "Failed to load teacher dashboard." },
      { status: 500 }
    );
  }
}