import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query("SELECT NOW() AS current_time");

    return NextResponse.json({
      status: "ok",
      database: "connected",
      time: result.rows[0].current_time,
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
      },
      { status: 500 }
    );
  }
}