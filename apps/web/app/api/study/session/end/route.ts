import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type EndSessionBody = {
  sessionId: string;
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const body: EndSessionBody = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
        UPDATE study_sessions
        SET ended_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING id, user_id, started_at, ended_at, session_type, total_items, correct_items
      `,
      [sessionId, currentUser.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Study session not found for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Study session ended successfully",
      session: result.rows[0],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("End study session error:", error);

    return NextResponse.json(
      { error: "Failed to end study session" },
      { status: 500 }
    );
  }
}