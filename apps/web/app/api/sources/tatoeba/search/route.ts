import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUserForApi } from "@/lib/auth-server";

function toTatoebaLanguageCode(language: string | null | undefined) {
  const normalized = (language ?? "").trim().toLowerCase();

  const map: Record<string, string> = {
    english: "eng",
    spanish: "spa",
    french: "fra",
    german: "deu",
    italian: "ita",
    portuguese: "por",
    nepali: "nep",
    hindi: "hin",
    japanese: "jpn",
    korean: "kor",

    eng: "eng",
    spa: "spa",
    fra: "fra",
    fre: "fra",
    deu: "deu",
    ger: "deu",
    ita: "ita",
    por: "por",
    nep: "nep",
    hin: "hin",
    jpn: "jpn",
    kor: "kor",
  };

  return map[normalized] ?? normalized;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedUserForApi();
    const body = await request.json();

    const normalizedBody = {
      ...body,
      from_language: toTatoebaLanguageCode(body.from_language),
      to_language: body.to_language
        ? toTatoebaLanguageCode(body.to_language)
        : undefined,
    };

    const response = await fetch(
      `${process.env.AI_SERVICE_URL}/sources/tatoeba/search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizedBody),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            result.detail ||
            result.error ||
            "Failed to search Tatoeba.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      items: result.items ?? result.results ?? [],
    });
  } catch (error) {
    console.error("Tatoeba search bridge error:", error);

    return NextResponse.json(
      { error: "Tatoeba search is currently unavailable." },
      { status: 500 }
    );
  }
}