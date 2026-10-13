import { db } from "@/lib/db";
import { upstashCommand, upstashConfigured } from "./upstash";

/**
 * Reaction counters (like button).
 *
 * Storage ladder (first match wins, failures fall through):
 *  1. Upstash Redis REST  — serverless (Vercel) backend, env-gated
 *  2. Prisma + SQLite     — local / self-hosted backend
 *  3. In-memory Map       — zero-config fallback (per-instance,
 *                           resets on cold start; keeps the demo alive)
 */

const redisKey = (key: string): string => `hyperreel:reaction:${key}`;

/** per-instance fallback so a bare Vercel deploy never 500s */
const memory = new Map<string, number>();

export async function getReactionCount(key = "like"): Promise<number> {
  if (upstashConfigured) {
    try {
      const result = await upstashCommand(["get", redisKey(key)]);
      return typeof result === "string" ? parseInt(result, 10) || 0 : 0;
    } catch {
      // fall through to prisma / memory
    }
  }
  try {
    const row = await db.reactionCounter.findUnique({ where: { key } });
    if (row) return row.count;
  } catch {
    // sqlite unavailable (serverless) → memory
  }
  return memory.get(key) ?? 0;
}

export async function incrementReaction(key = "like"): Promise<number> {
  if (upstashConfigured) {
    try {
      const result = await upstashCommand(["incr", redisKey(key)]);
      if (typeof result === "number") return result;
      return parseInt(String(result), 10) || 0;
    } catch {
      // fall through to prisma / memory
    }
  }
  try {
    const row = await db.reactionCounter.upsert({
      where: { key },
      update: { count: { increment: 1 } },
      create: { key, count: 1 },
    });
    return row.count;
  } catch {
    // sqlite unavailable (serverless) → memory
  }
  const next = (memory.get(key) ?? 0) + 1;
  memory.set(key, next);
  return next;
}
