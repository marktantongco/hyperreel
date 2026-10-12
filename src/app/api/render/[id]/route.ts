import { NextResponse } from "next/server";
import { getRenderJob } from "@/server/render";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/render/:id → { id, status, url, error, name } */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const job = await getRenderJob(id);
    if (!job) {
      return NextResponse.json({ error: "render job not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: job.id,
      status: job.status,
      url: job.url,
      error: job.error,
      name: job.name,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "lookup failed" },
      { status: 500 }
    );
  }
}
