import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";
import { withSpan } from "@/lib/telemetry";

type ReviewEventBody = {
  sessionId: string;
  learnerCardId: string;
  result: "known" | "learning" | "hard";
  bucketAfter: "known" | "learning" | "hard";
  responseTimeMs?: number | null;
};

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

        const { sessionId, learnerCardId, result, bucketAfter, responseTimeMs } = body;

        if (!sessionId || !learnerCardId || !result || !bucketAfter) {
          return NextResponse.json(
            { error: "sessionId, learnerCardId, result, and bucketAfter are required" },
            { status: 400 }
          );
        }

        const ownershipCheck = await db.query(
          `
            SELECT lc.id
            FROM learner_cards lc
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
          return NextResponse.json(
            { error: "Session or learner card not found for this user" },
            { status: 404 }
          );
        }

        const insertResult = await db.query(
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
            bucketAfter,
            responseTimeMs ?? null,
          ]
        );

        return NextResponse.json(
          {
            message: "Review event logged successfully",
            reviewEvent: insertResult.rows[0],
          },
          { status: 201 }
        );
      } catch (error) {
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.error("Review event logging error:", error);

        return NextResponse.json(
          { error: "Failed to log review event" },
          { status: 500 }
        );
      }
    }
  );
}