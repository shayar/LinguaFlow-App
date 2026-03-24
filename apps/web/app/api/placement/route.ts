import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const profileResult = await db.query(
      `
        SELECT
          native_language,
          target_language,
          verified_level,
          self_reported_level
        FROM learner_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [currentUser.id]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Learner profile not found." },
        { status: 404 }
      );
    }

    const profile = profileResult.rows[0];
    const learnerLevel =
      profile.verified_level ?? profile.self_reported_level ?? "Beginner";

    const response = await fetch(`${process.env.AI_SERVICE_URL}/generate-initial-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target_language: profile.target_language,
        native_language: profile.native_language,
        learner_level: learnerLevel,
        quiz_size: 12,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.detail || "Failed to generate placement quiz." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      profile,
      learnerLevel,
      items: result.items ?? [],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Placement quiz API error:", error);

    return NextResponse.json(
      { error: "Failed to load placement quiz." },
      { status: 500 }
    );
  }
}