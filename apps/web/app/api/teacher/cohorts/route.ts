import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeacherUserForApi } from "@/lib/auth-server";

type CreateCohortBody = {
  name: string;
  targetLanguage: string;
};

export async function GET() {
  try {
    const currentUser = await requireTeacherUserForApi();

    const result = await db.query(
      `
        SELECT
          c.id,
          c.name,
          c.target_language,
          c.created_by_user_id,
          c.created_at,
          COUNT(cm.id)::int AS member_count
        FROM cohorts c
        LEFT JOIN cohort_members cm ON cm.cohort_id = c.id
        WHERE c.created_by_user_id = $1
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `,
      [currentUser.id]
    );

    return NextResponse.json({
      cohorts: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("Fetch teacher cohorts error:", error);

    return NextResponse.json(
      { error: "Failed to fetch cohorts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireTeacherUserForApi();
    const body: CreateCohortBody = await request.json();

    const { name, targetLanguage } = body;

    if (!name || !targetLanguage) {
      return NextResponse.json(
        { error: "name and targetLanguage are required" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
        INSERT INTO cohorts (name, target_language, created_by_user_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, target_language, created_by_user_id, created_at
      `,
      [name, targetLanguage, currentUser.id]
    );

    return NextResponse.json(
      {
        message: "Cohort created successfully",
        cohort: result.rows[0],
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

    console.error("Create cohort error:", error);

    return NextResponse.json(
      { error: "Failed to create cohort" },
      { status: 500 }
    );
  }
}