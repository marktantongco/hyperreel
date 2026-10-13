import { NextResponse } from "next/server";
import { after } from "next/server";
import { createRenderJob, runRenderJob } from "@/server/render";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/render { name }
 * → creates a RenderJob row and kicks off the server-side Remotion render.
 * Response: { id, status, name } — poll GET /api/render/:id for progress.
 *
 * The render is kicked off with next/server `after()` so it survives the
 * response on Vercel (waitUntil semantics, bounded by maxDuration);
 * long-running self-hosted servers simply run it in the background.
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
    // kick off after the response: serverless-safe (Vercel waitUntil),
    // plain background fire-and-forget on self-hosted servers.
    const kick = () => {
      void runRenderJob(job.id, job.name).catch(() => {});
    };
    try {
      after(kick);
    } catch {
      // after() unavailable in this context → fire-and-forget
      kick();
    }
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
