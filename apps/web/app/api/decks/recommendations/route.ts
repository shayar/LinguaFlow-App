import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

function normalizeLevel(level: string | null | undefined): string {
  if (!level) return "Beginner";

  const normalized = level.trim().toLowerCase();

  if (normalized === "beginner") return "Beginner";
  if (normalized === "elementary") return "Elementary";
  if (normalized === "intermediate") return "Intermediate";
  if (normalized === "advanced") return "Advanced";

  return "Beginner";
}

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const profileResult = await db.query(
      `
        SELECT target_language, verified_level, self_reported_level
        FROM learner_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [currentUser.id]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Learner profile not found" },
        { status: 404 }
      );
    }

    const profile = profileResult.rows[0];
    const learnerLevel = normalizeLevel(
      profile.verified_level ?? profile.self_reported_level
    );
    const targetLanguage = profile.target_language ?? "English";

    const recommendationResult = await db.query(
      `
        SELECT
          d.id,
          d.title,
          d.language,
          d.difficulty_level,
          d.category,
          COUNT(c.id)::int AS card_count
        FROM decks d
        LEFT JOIN cards c ON c.deck_id = d.id
        WHERE d.language = $1
          AND (
            d.difficulty_level = $2
            OR d.difficulty_level = 'Beginner'
            OR d.difficulty_level IS NULL
          )
        GROUP BY d.id, d.title, d.language, d.difficulty_level, d.category
        ORDER BY
          CASE
            WHEN d.difficulty_level = $2 THEN 1
            WHEN d.difficulty_level = 'Beginner' THEN 2
            ELSE 3
          END,
          d.created_at DESC
        LIMIT 6
      `,
      [targetLanguage, learnerLevel]
    );

    return NextResponse.json({
      learnerLevel,
      targetLanguage,
      recommendations: recommendationResult.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Deck recommendations error:", error);

    return NextResponse.json(
      { error: "Failed to fetch deck recommendations" },
      { status: 500 }
    );
  }
}