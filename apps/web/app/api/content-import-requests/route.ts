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
          created_at
        FROM content_import_requests
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [currentUser.id]
    );

    return NextResponse.json({
      requests: result.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Content import requests GET error:", error);

    return NextResponse.json(
      { error: "Failed to load source registrations." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();
    const body: CreateImportRequestBody = await request.json();

    const { sourceType, sourceName, sourceUrl, language, notes, metadata } = body;

    if (!sourceType || !sourceName) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const insertedRequest = await client.query(
        `
          INSERT INTO content_import_requests (
            user_id,
            source_type,
            source_name,
            source_url,
            language,
            status,
            notes,
            metadata_json
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
          RETURNING
            id,
            source_type,
            source_name,
            source_url,
            language,
            status,
            notes,
            created_at
        `,
        [
          currentUser.id,
          sourceType,
          sourceName,
          sourceUrl ?? null,
          language ?? null,
          "registered",
          notes ?? null,
          JSON.stringify(metadata ?? {}),
        ]
      );

      const existingSource = await client.query(
        `
          SELECT id
          FROM content_sources
          WHERE source_name = $1
          LIMIT 1
        `,
        [sourceName]
      );

      if (existingSource.rows.length === 0) {
        await client.query(
          `
            INSERT INTO content_sources (
              source_type,
              source_name,
              language,
              provider,
              source_url,
              license_label,
              ingestion_status,
              quality_score,
              metadata_json
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
          `,
          [
            sourceType,
            sourceName,
            language ?? null,
            "community",
            sourceUrl ?? null,
            "user-submitted",
            "registered",
            60,
            JSON.stringify({
              notes: notes ?? null,
              submittedByUserId: currentUser.id,
              metadata: metadata ?? {},
            }),
          ]
        );
      }

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: "Source registered successfully.",
          request: insertedRequest.rows[0],
        },
        { status: 201 }
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Content import requests POST error:", error);

    return NextResponse.json(
      { error: "Failed to register source." },
      { status: 500 }
    );
  }
}