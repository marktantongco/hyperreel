import { NextResponse } from "next/server";
import { createRenderJob, runRenderJob } from "@/server/render";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/render { name }
 * → creates a RenderJob row and kicks off the server-side Remotion render.
 * Response: { id, status, name } — poll GET /api/render/:id for progress.
 */
export async function POST(request: Request) {
  let name = "YOU";
  try {
    const body = (await request.json()) as { name?: unknown };
    if (typeof body.name === "string" && body.name.trim().length > 0) {
      name = body.name.trim().slice(0, 32);
    }
  } catch {
    // malformed body → default name
  }

  try {
    const job = await createRenderJob(name);
    // fire-and-forget: long-running node server; the client polls status
    void runRenderJob(job.id, job.name).catch(() => {});
    return NextResponse.json(
      { id: job.id, status: job.status, name: job.name },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "could not create render job",
      },
      { status: 500 }
    );
  }
}
