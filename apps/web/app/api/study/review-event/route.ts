import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";
import { withSpan } from "@/lib/telemetry";

type ReviewEventBody = {
  sessionId: string;
  learnerCardId: string;
  result: "known" | "learning" | "hard";
  bucketAfter?: "known" | "learning" | "hard";
  responseTimeMs?: number | null;
};

function computeNextState(params: {
  currentBucket: string;
  currentMasteryScore: number;
  currentStreakCount: number;
  result: "known" | "learning" | "hard";
}) {
  const {
    currentBucket,
    currentMasteryScore,
    currentStreakCount,
    result,
  } = params;

  if (result === "known") {
    const nextMastery = Math.min(currentMasteryScore + 20, 100);
    const nextStreak = currentStreakCount + 1;

    let nextReviewHours = 24;
    if (nextStreak >= 2) nextReviewHours = 24 * 3;
    if (nextStreak >= 4) nextReviewHours = 24 * 7;
    if (nextStreak >= 6) nextReviewHours = 24 * 14;

    return {
      bucketAfter: "known" as const,
      masteryScore: nextMastery,
      streakCount: nextStreak,
      nextReviewAtSql: `NOW() + INTERVAL '${nextReviewHours} hours'`,
      shouldPromoteKnownWord: true,
    };
  }

  if (result === "learning") {
    const nextMastery =
      currentBucket === "hard"
        ? Math.min(currentMasteryScore + 8, 100)
        : Math.min(currentMasteryScore + 5, 100);

    return {
      bucketAfter: "learning" as const,
      masteryScore: nextMastery,
      streakCount: Math.max(currentStreakCount, 0),
      nextReviewAtSql: `NOW() + INTERVAL '8 hours'`,
      shouldPromoteKnownWord: false,
    };
  }

  return {
    bucketAfter: "hard" as const,
    masteryScore: Math.max(currentMasteryScore - 15, 0),
    streakCount: 0,
    nextReviewAtSql: `NOW() + INTERVAL '1 hour'`,
    shouldPromoteKnownWord: false,
  };
}

export async function POST(request: NextRequest) {
  return withSpan(
    "study.review-event.post",
    {
      "app.route": "/api/study/review-event",
      "app.feature": "review-event",
    },
    async () => {
      try {
        const currentUser = await requireAuthenticatedUserForApi();
        const body: ReviewEventBody = await request.json();

        const { sessionId, learnerCardId, result, responseTimeMs } = body;

        if (!sessionId || !learnerCardId || !result) {
          return NextResponse.json(
            { error: "sessionId, learnerCardId, and result are required." },
            { status: 400 }
          );
        }

        const client = await db.connect();

        try {
          await client.query("BEGIN");

          const ownershipCheck = await client.query(
            `
              SELECT
                lc.id,
                lc.bucket,
                lc.mastery_score,
                lc.streak_count,
                lc.card_id,
                c.target_word,
                d.language,
                ss.id AS session_id
              FROM learner_cards lc
              INNER JOIN cards c ON c.id = lc.card_id
              INNER JOIN decks d ON d.id = c.deck_id
              INNER JOIN study_sessions ss ON ss.user_id = lc.user_id
              WHERE lc.id = $1
                AND lc.user_id = $2
                AND ss.id = $3
                AND ss.user_id = $2
              LIMIT 1
            `,
            [learnerCardId, currentUser.id, sessionId]
          );

          if (ownershipCheck.rows.length === 0) {
            await client.query("ROLLBACK");

            return NextResponse.json(
              { error: "Session or learner card not found for this user." },
              { status: 404 }
            );
          }

          const current = ownershipCheck.rows[0];

          const nextState = computeNextState({
            currentBucket: current.bucket,
            currentMasteryScore: Number(current.mastery_score ?? 0),
            currentStreakCount: Number(current.streak_count ?? 0),
            result,
          });

          const learnerCardUpdate = await client.query(
            `
              UPDATE learner_cards
              SET
                bucket = $2,
                mastery_score = $3,
                streak_count = $4,
                last_reviewed_at = NOW(),
                next_review_at = ${nextState.nextReviewAtSql},
                updated_at = NOW()
              WHERE id = $1
              RETURNING
                id,
                bucket,
                mastery_score,
                streak_count,
                last_reviewed_at,
                next_review_at
            `,
            [
              learnerCardId,
              nextState.bucketAfter,
              nextState.masteryScore,
              nextState.streakCount,
            ]
          );

          const insertResult = await client.query(
            `
              INSERT INTO study_review_events (
                session_id,
                learner_card_id,
                result,
                bucket_after,
                response_time_ms
              )
              VALUES ($1, $2, $3, $4, $5)
              RETURNING id, session_id, learner_card_id, result, bucket_after, response_time_ms, created_at
            `,
            [
              sessionId,
              learnerCardId,
              result,
              nextState.bucketAfter,
              responseTimeMs ?? null,
            ]
          );

          await client.query(
            `
              UPDATE study_sessions
              SET
                total_items = total_items + 1,
                correct_items = correct_items + CASE WHEN $2 = 'known' THEN 1 ELSE 0 END
              WHERE id = $1
                AND user_id = $3
            `,
            [sessionId, result, currentUser.id]
          );

          if (nextState.shouldPromoteKnownWord) {
            await client.query(
              `
                INSERT INTO known_words (
                  user_id,
                  language,
                  word,
                  source,
                  source_card_id,
                  confidence_score
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id, language, word)
                DO UPDATE SET
                  confidence_score = GREATEST(known_words.confidence_score, EXCLUDED.confidence_score),
                  source_card_id = COALESCE(known_words.source_card_id, EXCLUDED.source_card_id),
                  updated_at = NOW()
              `,
              [
                currentUser.id,
                current.language,
                String(current.target_word).toLowerCase(),
                "study_review",
                current.card_id,
                100,
              ]
            );
          }

          await client.query("COMMIT");

          return NextResponse.json(
            {
              message: "Review event processed successfully.",
              reviewEvent: insertResult.rows[0],
              learnerCard: learnerCardUpdate.rows[0],
            },
            { status: 201 }
          );
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.error("Review event logging error:", error);

        return NextResponse.json(
          { error: "Failed to process review event." },
          { status: 500 }
        );
      }
    }
  );
}