import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createUserSession, hashPassword } from "@/lib/auth";

type OnboardingRequestBody = {
  email: string;
  password: string;
  fullName: string;
  nativeLanguage: string;
  targetLanguage: string;
  selfReportedLevel?: string;
  dailyGoalWords?: number;
};

export async function GET() {
  try {
    const result = await db.query(`
      SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        lp.native_language,
        lp.target_language,
        lp.self_reported_level,
        lp.verified_level,
        lp.daily_goal_words,
        lp.onboarding_completed,
        lp.initial_quiz_completed
      FROM users u
      LEFT JOIN learner_profiles lp ON lp.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT 10
    `);

    return NextResponse.json({
      users: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch onboarding data:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch onboarding data",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: OnboardingRequestBody = await request.json();

    const {
      email,
      password,
      fullName,
      nativeLanguage,
      targetLanguage,
      selfReportedLevel,
      dailyGoalWords = 10,
    } = body;

    if (!email || !password || !fullName || !nativeLanguage || !targetLanguage) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await db.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        {
          error: "User with this email already exists",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const insertedUserResult = await client.query(
        `
          INSERT INTO users (email, password_hash, full_name, role)
          VALUES ($1, $2, $3, $4)
          RETURNING id, email, full_name, role, created_at
        `,
        [normalizedEmail, passwordHash, fullName.trim(), "learner"]
      );

      const user = insertedUserResult.rows[0];

      const insertedProfileResult = await client.query(
        `
          INSERT INTO learner_profiles (
            user_id,
            native_language,
            target_language,
            self_reported_level,
            daily_goal_words,
            onboarding_completed,
            initial_quiz_completed
          )
          VALUES ($1, $2, $3, $4, $5, TRUE, FALSE)
          RETURNING id, user_id, native_language, target_language, self_reported_level, verified_level, daily_goal_words, onboarding_completed, initial_quiz_completed, created_at
        `,
        [
          user.id,
          nativeLanguage.trim() || "English",
          targetLanguage,
          selfReportedLevel ?? "Beginner",
          dailyGoalWords,
        ]
      );

      await client.query("COMMIT");

      await createUserSession(user.id);

      return NextResponse.json(
        {
          message: "Onboarding completed successfully",
          autoLoggedIn: true,
          user,
          learnerProfile: insertedProfileResult.rows[0],
        },
        { status: 201 }
      );
    } catch (transactionError) {
      await client.query("ROLLBACK");
      throw transactionError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Onboarding API error:", error);

    return NextResponse.json(
      {
        error: "Failed to complete onboarding",
      },
      { status: 500 }
    );
  }
}