import path from "node:path";
import fs from "node:fs/promises";
import { db } from "@/lib/db";

/**
 * Server-side Remotion render pipeline.
 *
 * POST /api/render creates a RenderJob row, then kicks off
 * renderJob() which dynamically imports @remotion/bundler +
 * @remotion/renderer. If the renderer or its headless browser cannot
 * be provisioned in the current environment, the job transitions to
 * status "unavailable" with a clear, actionable error — the round-trip
 * is real code, the outcome is environment-dependent by design.
 */

const RENDERS_DIR = path.join(process.cwd(), ".renders");
const BUNDLE_DIR = path.join(process.cwd(), ".remotion", "hyperreel-bundle");
const ENTRY_POINT = path.join(process.cwd(), "src", "video", "index.ts");

export type RenderJobStatus = "queued" | "rendering" | "done" | "unavailable" | "error";

export interface RenderJobRow {
  id: string;
  name: string;
  status: string;
  url: string | null;
  error: string | null;
}

export function renderPathForJob(id: string): string {
  return path.join(RENDERS_DIR, `${id}.mp4`);
}

export async function createRenderJob(name: string): Promise<RenderJobRow> {
  const job = await db.renderJob.create({ data: { name } });
  return job as RenderJobRow;
}

export async function getRenderJob(id: string): Promise<RenderJobRow | null> {
  const job = await db.renderJob.findUnique({ where: { id } });
  return (job as RenderJobRow) ?? null;
}

let bundlePromise: Promise<string> | null = null;

async function ensureBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const { bundle } = await import("@remotion/bundler");
      return bundle({
        entryPoint: ENTRY_POINT,
        onProgress: () => {},
        webpackOverride: (config) => config,
      });
    })().catch((err) => {
      bundlePromise = null; // allow retry on next job
      throw err;
    });
  }
  return bundlePromise;
}

/** Heuristics for "the render stack is not available in this environment". */
function isBrowserUnavailableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("browser") ||
    m.includes("chromium") ||
    m.includes("chrome-headless") ||
    m.includes("libnss") ||
    // a missing optional render-stack module (e.g. @remotion/whisper-webgpu)
    // means the Node-side renderer could not be provisioned here
    m.includes("cannot find module") ||
    (m.includes("enoent") && m.includes("chrome")) ||
    (m.includes("download") && m.includes("browser"))
  );
}

export async function runRenderJob(id: string, name: string): Promise<void> {
  try {
    await db.renderJob.update({ where: { id }, data: { status: "rendering" } });
    await fs.mkdir(RENDERS_DIR, { recursive: true });

    // Dynamic imports: if these fail, the job degrades gracefully.
    const serveUrl = await ensureBundle();
    const { selectComposition, renderMedia } = await import("@remotion/renderer");

    const inputProps = { name };
    const composition = await selectComposition({
      serveUrl,
      id: "HyperReel",
      inputProps,
    });

    const outputLocation = renderPathForJob(id);
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation,
      inputProps,
      onProgress: () => {},
    });

    await db.renderJob.update({
      where: { id },
      data: { status: "done", url: `/api/render/${id}/file`, error: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status: RenderJobStatus = isBrowserUnavailableError(message)
      ? "unavailable"
      : "error";
    const friendly =
      status === "unavailable"
        ? `Server rendering needs Remotion's headless Chrome, which could not be provisioned in this environment (${message.slice(0, 180)}). The in-browser preview stays your live personalized clip; render locally with the Remotion CLI or via Remotion Lambda.`
        : message.slice(0, 500);
    try {
      await db.renderJob.update({
        where: { id },
        data: { status, error: friendly },
      });
    } catch {
      // job row gone — nothing else to do
    }
  }
}
