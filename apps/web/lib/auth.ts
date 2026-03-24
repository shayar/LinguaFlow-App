import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "linguaflow_session";

export async function hashPassword(password: string) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function setSessionCookie(sessionToken: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function createUserSession(userId: string) {
  const sessionToken = createSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.query(
    `
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, $3)
    `,
    [userId, sessionToken, expiresAt]
  );

  await setSessionCookie(sessionToken);

  return {
    sessionToken,
    expiresAt,
  };
}