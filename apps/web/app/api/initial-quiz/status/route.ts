import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const result = await db.query(
      `
        SELECT
          target_language,
          native_language,
          verified_level,
          self_reported_level,
          initial_quiz_completed,
          initial_assessment_completed_at,
          initial_assessment_locked
        FROM learner_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [currentUser.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Learner profile not found." },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    return NextResponse.json({
      alreadyCompleted:
        Boolean(row.initial_quiz_completed) ||
        Boolean(row.initial_assessment_completed_at),
      locked: Boolean(row.initial_assessment_locked),
      targetLanguage: row.target_language ?? "Spanish",
      nativeLanguage: row.native_language ?? "English",
      learnerLevel:
        row.verified_level ??
        row.self_reported_level ??
        "Beginner",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Initial quiz status API error:", error);

    return NextResponse.json(
      { error: "Failed to load initial quiz status." },
      { status: 500 }
    );
  }
}