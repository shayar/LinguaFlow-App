import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionCookie } from "@/lib/auth";

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const sessionToken = await getSessionCookie();

  if (!sessionToken) {
    return null;
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
    return null;
  }

  const user = result.rows[0];

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
  };
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAuthenticatedUserForApi(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export async function requireTeacherUserForApi(): Promise<AuthenticatedUser> {
  const user = await requireAuthenticatedUserForApi();

  if (user.role !== "teacher" && user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return user;
}