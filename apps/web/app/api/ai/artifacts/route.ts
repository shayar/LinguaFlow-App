import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongo";
import { db } from "@/lib/db";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

type SaveArtifactBody = {
  learnerCardId: string;
  targetWord: string;
  translation: string;
  targetLanguage: string;
  learnerLevel?: string;
  exampleSentence: string;
  exampleTranslationNative?: string;
  explanation: string;
  source: "fastapi-generate-example";
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const body: SaveArtifactBody = await request.json();

    const {
      learnerCardId,
      targetWord,
      translation,
      targetLanguage,
      learnerLevel,
      exampleSentence,
      exampleTranslationNative,
      explanation,
      source,
    } = body;

    if (
      !learnerCardId ||
      !targetWord ||
      !translation ||
      !targetLanguage ||
      !exampleSentence ||
      !explanation ||
      !source
    ) {
      return NextResponse.json(
        { error: "Missing required fields for saving AI artifact" },
        { status: 400 }
      );
    }

    const learnerCardCheck = await db.query(
      `
        SELECT id
        FROM learner_cards
        WHERE id = $1 AND user_id = $2
      `,
      [learnerCardId, currentUser.id]
    );

    if (learnerCardCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Learner card not found for this user" },
        { status: 404 }
      );
    }

    const mongoDb = await getMongoDb();
    const collection = mongoDb.collection("ai_artifacts");

    const insertResult = await collection.insertOne({
      learnerCardId,
      userId: currentUser.id,
      targetWord,
      translation,
      targetLanguage,
      learnerLevel: learnerLevel ?? null,
      exampleSentence,
      exampleTranslationNative: exampleTranslationNative ?? null,
      explanation,
      source,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        message: "AI artifact saved successfully",
        artifactId: insertResult.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Save AI artifact error:", error);

    return NextResponse.json(
      { error: "Failed to save AI artifact" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUserForApi();

    const { searchParams } = new URL(request.url);
    const learnerCardId = searchParams.get("learnerCardId");

    if (!learnerCardId) {
      return NextResponse.json(
        { error: "learnerCardId is required" },
        { status: 400 }
      );
    }

    const learnerCardCheck = await db.query(
      `
        SELECT id
        FROM learner_cards
        WHERE id = $1 AND user_id = $2
      `,
      [learnerCardId, currentUser.id]
    );

    if (learnerCardCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Learner card not found for this user" },
        { status: 404 }
      );
    }

    const mongoDb = await getMongoDb();
    const collection = mongoDb.collection("ai_artifacts");

    const latestArtifact = await collection.findOne(
      { learnerCardId, userId: currentUser.id },
      { sort: { createdAt: -1 } }
    );

    return NextResponse.json({
      artifact: latestArtifact,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Fetch AI artifact error:", error);

    return NextResponse.json(
      { error: "Failed to fetch AI artifact" },
      { status: 500 }
    );
  }
}