import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${process.env.AI_SERVICE_URL}/generate-example`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.detail || "AI example generation failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate example bridge error:", error);

    return NextResponse.json(
      { error: "Failed to generate example" },
      { status: 500 }
    );
  }
}