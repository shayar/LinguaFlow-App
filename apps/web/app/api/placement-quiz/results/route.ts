import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query(`
      SELECT
        pq.id,
        pq.user_id,
        u.email,
        u.full_name,
        pq.score,
        pq.estimated_level,
        pq.confidence,
        pq.created_at
      FROM placement_quizzes pq
      INNER JOIN users u ON u.id = pq.user_id
      ORDER BY pq.created_at DESC
      LIMIT 20
    `);

    return NextResponse.json({
      results: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch placement quiz results:", error);

    return NextResponse.json(
      { error: "Failed to fetch placement quiz results" },
      { status: 500 }
    );
  }
}