import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  comparePassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";

type LoginBody = {
  email: string;
  password: string;
};

export async function POST(request: NextRequest) {
  try {
    const body: LoginBody = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userResult = await db.query(
      `
        SELECT id, email, full_name, role, password_hash
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    const passwordMatches = await comparePassword(password, user.password_hash);

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const sessionToken = createSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
      `
        INSERT INTO user_sessions (user_id, session_token, expires_at)
        VALUES ($1, $2, $3)
      `,
      [user.id, sessionToken, expiresAt]
    );

    await setSessionCookie(sessionToken);

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login API error:", error);

    return NextResponse.json(
      { error: "Failed to log in" },
      { status: 500 }
    );
  }
}