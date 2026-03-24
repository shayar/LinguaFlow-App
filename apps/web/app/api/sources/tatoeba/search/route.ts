import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedUserForApi();

    const body = await request.json();

    const response = await fetch(
      `${process.env.AI_SERVICE_URL}/sources/tatoeba/search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.detail || "Tatoeba search is temporarily unavailable." },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Tatoeba search bridge error:", error);

    return NextResponse.json(
      { error: "Failed to search Tatoeba." },
      { status: 500 }
    );
  }
}