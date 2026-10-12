import { NextResponse } from "next/server";
import { getReactionCount, incrementReaction } from "@/server/reactions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/reactions → { count } */
export async function GET() {
  try {
    const count = await getReactionCount("like");
    return NextResponse.json({ count });
  } catch {
    // DB unavailable — client falls back to localStorage
    return NextResponse.json({ count: 0, fallback: true });
  }
}

/** POST /api/reactions { kind: "like" } → upsert + increment → { count } */
export async function POST(request: Request) {
  let kind = "like";
  try {
    const body = (await request.json()) as { kind?: unknown };
    if (typeof body.kind === "string" && body.kind.length > 0) {
      kind = body.kind.slice(0, 64);
    }
  } catch {
    // malformed body → default kind
  }
  try {
    const count = await incrementReaction(kind);
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json(
      {
        count: 0,
        error: err instanceof Error ? err.message : "reaction upsert failed",
      },
      { status: 500 }
    );
  }
}
