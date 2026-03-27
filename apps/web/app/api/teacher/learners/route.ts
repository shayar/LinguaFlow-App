import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
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
        { error: "You do not have permission to access learners." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();

    const result = await db.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.role,
          lp.target_language,
          lp.native_language,
          lp.verified_level,
          lp.self_reported_level
        FROM users u
        LEFT JOIN learner_profiles lp ON lp.user_id = u.id
        WHERE (
          u.role IN ('learner', 'student')
        )
        AND (
          $1 = ''
          OR u.full_name ILIKE '%' || $1 || '%'
          OR u.email ILIKE '%' || $1 || '%'
          OR COALESCE(lp.target_language, '') ILIKE '%' || $1 || '%'
        )
        ORDER BY u.created_at DESC
        LIMIT 30
      `,
      [q]
    );

    return NextResponse.json({
      learners: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Teacher learners API error:", error);

    return NextResponse.json(
      { error: "Failed to load learners." },
      { status: 500 }
    );
  }
}