import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type UpdateSentenceReviewBody = {
  reviewStatus: "teacher_approved" | "teacher_rejected";
  teacherFeedback?: string;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const { reviewId } = await context.params;
    const body: UpdateSentenceReviewBody = await request.json();

    const { reviewStatus, teacherFeedback } = body;

    if (!reviewStatus) {
      return NextResponse.json(
        { error: "reviewStatus is required" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
        UPDATE sentence_reviews
        SET
          review_status = $1,
          teacher_feedback = $2,
          reviewed_by_user_id = $3,
          reviewed_at = NOW()
        WHERE id = $4
        RETURNING id, review_status, teacher_feedback, reviewed_by_user_id, reviewed_at
      `,
      [reviewStatus, teacherFeedback ?? null, currentUser.id, reviewId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Sentence review not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Sentence review updated successfully",
      sentenceReview: result.rows[0],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Update sentence review error:", error);

    return NextResponse.json(
      { error: "Failed to update sentence review" },
      { status: 500 }
    );
  }
}