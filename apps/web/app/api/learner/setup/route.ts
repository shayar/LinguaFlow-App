import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type LearnerSetupBody = {
  nativeLanguage: string;
  targetLanguage: string;
  selfReportedLevel: string;
  dailyGoalWords: number;
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: LearnerSetupBody = await request.json();

    const {
      nativeLanguage,
      targetLanguage,
      selfReportedLevel,
      dailyGoalWords,
    } = body;

    if (!targetLanguage || !selfReportedLevel) {
      return NextResponse.json(
        { error: "targetLanguage and selfReportedLevel are required" },
        { status: 400 }
      );
    }

    await db.query(
      `
        INSERT INTO learner_profiles (
          user_id,
          native_language,
          target_language,
          self_reported_level,
          daily_goal_words,
          onboarding_completed,
          initial_quiz_completed
        )
        VALUES ($1, $2, $3, $4, $5, TRUE, FALSE)
        ON CONFLICT (user_id)
        DO UPDATE SET
          native_language = EXCLUDED.native_language,
          target_language = EXCLUDED.target_language,
          self_reported_level = EXCLUDED.self_reported_level,
          daily_goal_words = EXCLUDED.daily_goal_words,
          onboarding_completed = TRUE,
          updated_at = NOW()
      `,
      [
        currentUser.id,
        nativeLanguage?.trim() || "English",
        targetLanguage,
        selfReportedLevel,
        dailyGoalWords || 12,
      ]
    );

    return NextResponse.json({
      message: "Learner setup completed successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Learner setup route error:", error);

    return NextResponse.json(
      { error: "Failed to complete learner setup" },
      { status: 500 }
    );
  }
}