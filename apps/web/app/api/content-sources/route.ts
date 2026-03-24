import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function GET() {
  try {
    await requireAuthenticatedUserForApi();

    const result = await db.query(
      `
        SELECT
          id,
          source_type,
          source_name,
          language,
          provider,
          source_url,
          license_label,
          ingestion_status,
          quality_score,
          metadata_json,
          created_at,
          updated_at
        FROM content_sources
        ORDER BY quality_score DESC, created_at DESC
      `
    );

    return NextResponse.json({
      sources: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Content sources fetch error:", error);

    return NextResponse.json(
      { error: "Failed to fetch content sources" },
      { status: 500 }
    );
  }
}