import { db } from "@/lib/db";

/**
 * Reaction counters (like button) — upsert-backed, SQLite via Prisma.
 */

export async function getReactionCount(key = "like"): Promise<number> {
  const row = await db.reactionCounter.findUnique({ where: { key } });
  return row?.count ?? 0;
}

export async function incrementReaction(key = "like"): Promise<number> {
  const row = await db.reactionCounter.upsert({
    where: { key },
    update: { count: { increment: 1 } },
    create: { key, count: 1 },
  });
  return row.count;
}
