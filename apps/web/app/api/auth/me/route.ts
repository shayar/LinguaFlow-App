import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionCookie } from "@/lib/auth";

export async function GET() {
  try {
    const sessionToken = await getSessionCookie();

    if (!sessionToken) {
      return NextResponse.json(
        { user: null },
        { status: 200 }
      );
    }

    const result = await db.query(
      `
        SELECT
          u.id,
          u.email,
          u.full_name,
          u.role
        FROM user_sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.session_token = $1
          AND s.expires_at > NOW()
        LIMIT 1
      `,
      [sessionToken]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = result.rows[0];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Auth me API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch current user" },
      { status: 500 }
    );
  }
}