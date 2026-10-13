import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getRenderJob, renderPathForJob } from "@/server/render";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/render/:id/file → streams the rendered MP4 (download).
 */
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
    if (job.status !== "done") {
      return NextResponse.json(
        { error: `render is ${job.status}` },
        { status: 409 }
      );
    }
    // Lambda renders produce presigned S3 URLs — redirect to them
    // instead of streaming from the (serverless, read-only) filesystem.
    if (job.url && /^https?:\/\//.test(job.url)) {
      return NextResponse.redirect(job.url, 307);
    }
    const filePath = renderPathForJob(id);
    const file = await fs.readFile(filePath).catch(() => null);
    if (!file) {
      return NextResponse.json({ error: "rendered file missing" }, { status: 410 });
    }
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(file.byteLength),
        "Content-Disposition": `attachment; filename="hyperreel-${(job.name || "you")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-${id.slice(0, 6)}.mp4"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "file streaming failed" },
      { status: 500 }
    );
  }
}
