import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeacherUserForApi } from "@/lib/auth-server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ cohortId: string }> }
) {
  try {
    const currentUser = await requireTeacherUserForApi();
    const { cohortId } = await context.params;

    const ownershipCheck = await db.query(
      `
        SELECT id
        FROM cohorts
        WHERE id = $1 AND created_by_user_id = $2
        LIMIT 1
      `,
      [cohortId, currentUser.id]
    );

    if (ownershipCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Cohort not found or not owned by this teacher" },
        { status: 404 }
      );
    }

    const result = await db.query(
      `
        SELECT
          sr.id,
          sr.user_id,
          u.full_name,
          u.email,
          sr.target_word,
          sr.target_language,
          sr.learner_level,
          sr.generated_sentence,
          sr.explanation,
          sr.advanced_word_count,
          sr.advanced_words_json,
          sr.known_words_matched_json,
          sr.replacements_used_json,
          sr.iterations_used,
          sr.accepted,
          sr.review_status,
          sr.teacher_feedback,
          sr.reviewed_by_user_id,
          sr.reviewed_at,
          sr.created_at
        FROM sentence_reviews sr
        INNER JOIN cohort_members cm ON cm.user_id = sr.user_id
        INNER JOIN users u ON u.id = sr.user_id
        WHERE cm.cohort_id = $1
        ORDER BY sr.created_at DESC
        LIMIT 100
      `,
      [cohortId]
    );

    return NextResponse.json({
      sentenceReviews: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("Fetch cohort sentence reviews error:", error);

    return NextResponse.json(
      { error: "Failed to fetch cohort sentence reviews" },
      { status: 500 }
    );
  }
}