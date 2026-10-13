/**
 * Tiny Upstash Redis REST client (no SDK dependency — plain fetch).
 *
 * Upstash is the serverless-friendly store for the Vercel deployment:
 * Prisma + SQLite is the local-dev backend; when these env vars are set
 * the reactions counters and the render-queue rows live in Redis instead.
 *
 * Env:
 *   UPSTASH_REDIS_REST_URL   https://<xxx>.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN <token>
 */

const UPSTASH_URL = (process.env.UPSTASH_REDIS_REST_URL || "").replace(
  /\/+$/,
  ""
);
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const upstashConfigured = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

/**
 * GET-style Upstash REST command; each argument is a path segment.
 * Example: upstashCommand(["incr", "hyperreel:reaction:like"])
 * Throws on HTTP/API errors so callers can fall back.
 */
export async function upstashCommand(segments: string[]): Promise<unknown> {
  if (!upstashConfigured) throw new Error("upstash not configured");
  const url = `${UPSTASH_URL}/${segments.map(encodeURIComponent).join("/")}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash http ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(`upstash: ${json.error}`);
  return json.result;
}
