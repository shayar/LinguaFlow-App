import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type SessionNoteBody = {
  sessionId: string;
  title?: string;
  content?: string;
};

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
        SELECT
          id,
          user_id,
          session_id,
          title,
          content,
          created_at,
          updated_at
        FROM study_session_notes
        WHERE user_id = $1
          AND session_id = $2
        LIMIT 1
      `,
      [currentUser.id, sessionId]
    );

    return NextResponse.json({
      note: result.rows[0] ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Session note GET error:", error);

    return NextResponse.json(
      { error: "Failed to load session note" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: SessionNoteBody = await request.json();

    const { sessionId, title, content } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const ownershipCheck = await db.query(
      `
        SELECT id
        FROM study_sessions
        WHERE id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [sessionId, currentUser.id]
    );

    if (ownershipCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Study session not found" },
        { status: 404 }
      );
    }

    const result = await db.query(
      `
        INSERT INTO study_session_notes (
          user_id,
          session_id,
          title,
          content
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, session_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          updated_at = NOW()
        RETURNING
          id,
          user_id,
          session_id,
          title,
          content,
          created_at,
          updated_at
      `,
      [
        currentUser.id,
        sessionId,
        title ?? null,
        content ?? "",
      ]
    );

    return NextResponse.json({
      message: "Session note saved successfully",
      note: result.rows[0],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Session note POST error:", error);

    return NextResponse.json(
      { error: "Failed to save session note" },
      { status: 500 }
    );
  }
}