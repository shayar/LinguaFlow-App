import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const profileResult = await db.query(
      `
        SELECT
          target_language,
          native_language,
          verified_level,
          self_reported_level,
          daily_goal_words
        FROM learner_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [currentUser.id]
    );

    const statsResult = await db.query(
      `
        SELECT
          COUNT(*)::int AS total_cards,
          COALESCE(SUM(CASE WHEN bucket = 'known' THEN 1 ELSE 0 END), 0)::int AS known_count,
          COALESCE(SUM(CASE WHEN bucket = 'learning' THEN 1 ELSE 0 END), 0)::int AS learning_count,
          COALESCE(SUM(CASE WHEN bucket = 'hard' THEN 1 ELSE 0 END), 0)::int AS hard_count
        FROM learner_cards
        WHERE user_id = $1
      `,
      [currentUser.id]
    );

    const dueNowResult = await db.query(
      `
        SELECT
          lc.id AS learner_card_id,
          lc.bucket,
          lc.mastery_score,
          lc.next_review_at,
          c.target_word,
          c.translation,
          c.example_sentence,
          d.language,
          d.title AS deck_title
        FROM learner_cards lc
        INNER JOIN cards c ON c.id = lc.card_id
        INNER JOIN decks d ON d.id = c.deck_id
        WHERE lc.user_id = $1
          AND (lc.next_review_at IS NULL OR lc.next_review_at <= NOW())
        ORDER BY
          CASE
            WHEN lc.bucket = 'hard' THEN 1
            WHEN lc.bucket = 'learning' THEN 2
            WHEN lc.bucket = 'known' THEN 3
            ELSE 4
          END,
          lc.mastery_score ASC,
          lc.last_reviewed_at ASC NULLS FIRST
        LIMIT 8
      `,
      [currentUser.id]
    );

    const weakWordsResult = await db.query(
      `
        SELECT
          lc.id AS learner_card_id,
          lc.bucket,
          lc.mastery_score,
          c.target_word,
          c.translation,
          d.title AS deck_title
        FROM learner_cards lc
        INNER JOIN cards c ON c.id = lc.card_id
        INNER JOIN decks d ON d.id = c.deck_id
        WHERE lc.user_id = $1
          AND lc.bucket IN ('hard', 'learning')
        ORDER BY
          CASE
            WHEN lc.bucket = 'hard' THEN 1
            ELSE 2
          END,
          lc.mastery_score ASC,
          lc.updated_at DESC
        LIMIT 6
      `,
      [currentUser.id]
    );

    const decksResult = await db.query(
      `
        SELECT
          d.id,
          d.title,
          d.language,
          COUNT(DISTINCT c.id)::int AS card_count,
          COALESCE(AVG(lc.mastery_score), 0)::float AS avg_mastery_score
        FROM decks d
        INNER JOIN cards c ON c.deck_id = d.id
        INNER JOIN learner_cards lc ON lc.card_id = c.id
        WHERE lc.user_id = $1
        GROUP BY d.id, d.title, d.language
        ORDER BY MAX(lc.last_reviewed_at) DESC NULLS LAST, d.created_at DESC
        LIMIT 4
      `,
      [currentUser.id]
    );

    const todayReviewsResult = await db.query(
      `
        SELECT COUNT(*)::int AS reviewed_today
        FROM study_review_events sre
        INNER JOIN learner_cards lc ON lc.id = sre.learner_card_id
        WHERE lc.user_id = $1
          AND sre.created_at::date = CURRENT_DATE
      `,
      [currentUser.id]
    );

    const profile = profileResult.rows[0] ?? null;
    const stats = statsResult.rows[0] ?? {
      total_cards: 0,
      known_count: 0,
      learning_count: 0,
      hard_count: 0,
    };

    const reviewedToday = todayReviewsResult.rows[0]?.reviewed_today ?? 0;
    const dailyGoal = profile?.daily_goal_words ?? 10;

    return NextResponse.json({
      profile,
      stats,
      reviewedToday,
      dailyGoal,
      dueNow: dueNowResult.rows,
      weakWords: weakWordsResult.rows,
      decks: decksResult.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Dashboard API error:", error);

    return NextResponse.json(
      { error: "Failed to load dashboard." },
      { status: 500 }
    );
  }
}