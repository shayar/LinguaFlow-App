import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeacherUserForApi } from "@/lib/auth-server";

type AddMemberBody = {
  learnerEmail: string;
};

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
          cm.id,
          cm.role_in_cohort,
          cm.created_at,
          u.id AS user_id,
          u.email,
          u.full_name,
          u.role
        FROM cohort_members cm
        INNER JOIN users u ON u.id = cm.user_id
        WHERE cm.cohort_id = $1
        ORDER BY cm.created_at DESC
      `,
      [cohortId]
    );

    return NextResponse.json({
      members: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("Fetch cohort members error:", error);

    return NextResponse.json(
      { error: "Failed to fetch cohort members" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ cohortId: string }> }
) {
  try {
    const currentUser = await requireTeacherUserForApi();
    const { cohortId } = await context.params;
    const body: AddMemberBody = await request.json();

    const { learnerEmail } = body;

    if (!learnerEmail) {
      return NextResponse.json(
        { error: "learnerEmail is required" },
        { status: 400 }
      );
    }

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

    const learnerResult = await db.query(
      `
        SELECT id, email, full_name, role
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [learnerEmail]
    );

    if (learnerResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Learner not found" },
        { status: 404 }
      );
    }

    const learner = learnerResult.rows[0];

    const insertResult = await db.query(
      `
        INSERT INTO cohort_members (cohort_id, user_id, role_in_cohort)
        VALUES ($1, $2, $3)
        ON CONFLICT (cohort_id, user_id) DO NOTHING
        RETURNING id, cohort_id, user_id, role_in_cohort, created_at
      `,
      [cohortId, learner.id, "learner"]
    );

    return NextResponse.json(
      {
        message:
          insertResult.rows.length > 0
            ? "Learner added to cohort"
            : "Learner already belongs to this cohort",
        member: insertResult.rows[0] ?? null,
        learner: {
          id: learner.id,
          email: learner.email,
          fullName: learner.full_name,
          role: learner.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("Add learner to cohort error:", error);

    return NextResponse.json(
      { error: "Failed to add learner to cohort" },
      { status: 500 }
    );
  }
}