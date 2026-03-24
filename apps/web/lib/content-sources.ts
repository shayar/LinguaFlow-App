import { db } from "@/lib/db";

export async function getContentSourceIdByName(sourceName: string): Promise<string | null> {
  const result = await db.query(
    `
      SELECT id
      FROM content_sources
      WHERE source_name = $1
      LIMIT 1
    `,
    [sourceName]
  );

  return result.rows[0]?.id ?? null;
}