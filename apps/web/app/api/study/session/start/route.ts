import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type StartSessionBody = {
  sessionType?: string;
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: StartSessionBody = await request.json();
    const { sessionType = "review" } = body;

    const result = await db.query(
      `
        INSERT INTO study_sessions (user_id, session_type)
        VALUES ($1, $2)
        RETURNING id, user_id, started_at, ended_at, session_type, total_items, correct_items
      `,
      [currentUser.id, sessionType]
    );

    return NextResponse.json(
      {
        message: "Study session started successfully",
        session: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Start study session error:", error);

    return NextResponse.json(
      { error: "Failed to start study session" },
      { status: 500 }
    );
  }
}