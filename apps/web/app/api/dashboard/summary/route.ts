import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const profileResult = await db.query(
      `
        SELECT
          u.id,
          u.email,
          u.full_name,
          lp.native_language,
          lp.target_language,
          lp.self_reported_level,
          lp.verified_level,
          lp.daily_goal_words,
          lp.onboarding_completed,
          lp.initial_quiz_completed
        FROM users u
        INNER JOIN learner_profiles lp ON lp.user_id = u.id
        WHERE u.id = $1
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

    const todayProgressResult = await db.query(
      `
        SELECT COUNT(*)::int AS reviewed_today
        FROM study_review_events sre
        INNER JOIN learner_cards lc ON lc.id = sre.learner_card_id
        WHERE lc.user_id = $1
          AND sre.created_at::date = CURRENT_DATE
      `,
      [currentUser.id]
    );

    const bucketDistributionResult = await db.query(
      `
        SELECT bucket, COUNT(*)::int AS count
        FROM learner_cards
        WHERE user_id = $1
        GROUP BY bucket
        ORDER BY bucket
      `,
      [currentUser.id]
    );

    const recentSessionsResult = await db.query(
      `
        SELECT
          ss.id,
          ss.started_at,
          ss.ended_at,
          ss.session_type,
          COALESCE(COUNT(sre.id), 0)::int AS total_items,
          COALESCE(SUM(CASE WHEN sre.result = 'known' THEN 1 ELSE 0 END), 0)::int AS correct_items
        FROM study_sessions ss
        LEFT JOIN study_review_events sre ON sre.session_id = ss.id
        WHERE ss.user_id = $1
        GROUP BY ss.id, ss.started_at, ss.ended_at, ss.session_type
        ORDER BY ss.started_at DESC
        LIMIT 8
      `,
      [currentUser.id]
    );

    const masterySnapshotResult = await db.query(
      `
        SELECT
          COUNT(*)::int AS total_cards,
          COALESCE(AVG(mastery_score), 0)::float AS average_mastery_score
        FROM learner_cards
        WHERE user_id = $1
      `,
      [currentUser.id]
    );

    const reviewedToday = todayProgressResult.rows[0]?.reviewed_today ?? 0;
    const dailyGoalWords = profile.daily_goal_words ?? 10;

    return NextResponse.json({
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        native_language: profile.native_language,
        target_language: profile.target_language,
        self_reported_level: profile.self_reported_level,
        verified_level: profile.verified_level,
        daily_goal_words: profile.daily_goal_words,
        onboarding_completed: profile.onboarding_completed,
        initial_quiz_completed: profile.initial_quiz_completed,
      },
      todayProgress: {
        reviewedToday,
        dailyGoalWords,
        goalCompleted: reviewedToday >= dailyGoalWords,
      },
      bucketDistribution: bucketDistributionResult.rows,
      recentSessions: recentSessionsResult.rows,
      masterySnapshot: masterySnapshotResult.rows[0] ?? {
        total_cards: 0,
        average_mastery_score: 0,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Dashboard summary error:", error);

    return NextResponse.json(
      { error: "Failed to load dashboard summary" },
      { status: 500 }
    );
  }
}