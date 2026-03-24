import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clearSessionCookie, getSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    const sessionToken = await getSessionCookie();

    if (sessionToken) {
      await db.query(
        `DELETE FROM user_sessions WHERE session_token = $1`,
        [sessionToken]
      );
    }

    await clearSessionCookie();

    return NextResponse.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout API error:", error);

    return NextResponse.json(
      { error: "Failed to log out" },
      { status: 500 }
    );
  }
}