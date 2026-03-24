import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type CreateImportRequestBody = {
  sourceType: string;
  sourceName: string;
  sourceUrl?: string;
  language?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
};

export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const result = await db.query(
      `
        SELECT
          id,
          source_type,
          source_name,
          source_url,
          language,
          status,
          notes,
          metadata_json,
          created_at,
          updated_at
        FROM content_import_requests
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [currentUser.id]
    );

    return NextResponse.json({
      requests: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Content import request list error:", error);

    return NextResponse.json(
      { error: "Failed to fetch import requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: CreateImportRequestBody = await request.json();

    const {
      sourceType,
      sourceName,
      sourceUrl,
      language,
      notes,
      metadata,
    } = body;

    if (!sourceType || !sourceName) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
        INSERT INTO content_import_requests (
          user_id,
          source_type,
          source_name,
          source_url,
          language,
          notes,
          metadata_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        RETURNING
          id,
          source_type,
          source_name,
          source_url,
          language,
          status,
          notes,
          metadata_json,
          created_at,
          updated_at
      `,
      [
        currentUser.id,
        sourceType,
        sourceName,
        sourceUrl ?? null,
        language ?? null,
        notes ?? null,
        JSON.stringify(metadata ?? {}),
      ]
    );

    return NextResponse.json(
      {
        message: "Import request created successfully",
        request: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Create content import request error:", error);

    return NextResponse.json(
      { error: "Failed to create import request" },
      { status: 500 }
    );
  }
}