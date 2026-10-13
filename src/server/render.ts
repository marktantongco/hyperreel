import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { AwsRegion } from "@remotion/lambda";
import { db } from "@/lib/db";
import { upstashCommand, upstashConfigured } from "./upstash";

/**
 * Server-side Remotion render pipeline.
 *
 * Two backends, selected by environment:
 *
 *  1. Remotion Lambda (serverless / Vercel) — env-gated:
 *     REMOTION_LICENSE_KEY + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY.
 *     Site bundle + render function are created on demand in S3/Lambda;
 *     renders land as presigned download URLs in the job row.
 *
 *  2. Local renderer (@remotion/bundler + @remotion/renderer) — the
 *     self-hosted path. If the renderer or its headless browser cannot
 *     be provisioned in the current environment, the job transitions
 *     to status "unavailable" with a clear, actionable error — the
 *     round-trip is real code, the outcome is environment-dependent
 *     by design.
 *
 * Job rows live in Upstash Redis when configured (serverless-safe),
 * else Prisma/SQLite (local dev).
 */

const RENDERS_DIR = path.join(process.cwd(), ".renders");
const ENTRY_POINT = path.join(process.cwd(), "src", "video", "index.ts");

export type RenderJobStatus =
  | "queued"
  | "rendering"
  | "done"
  | "unavailable"
  | "error";

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

// ---------------------------------------------------------------------------
// job store — Upstash (serverless) or Prisma/SQLite (local)
// ---------------------------------------------------------------------------
const JOB_TTL_SECONDS = 60 * 60 * 24 * 7; // keep finished jobs for a week

const jobKey = (id: string): string => `hyperreel:renderjob:${id}`;

export async function createRenderJob(name: string): Promise<RenderJobRow> {
  if (upstashConfigured) {
    const id = randomUUID();
    await upstashCommand([
      "hset",
      jobKey(id),
      "id",
      id,
      "name",
      name,
      "status",
      "queued",
    ]);
    await upstashCommand([
      "expire",
      jobKey(id),
      String(JOB_TTL_SECONDS),
    ]).catch(() => {});
    return { id, name, status: "queued", url: null, error: null };
  }
  const job = await db.renderJob.create({ data: { name } });
  return {
    id: job.id,
    name: job.name,
    status: job.status,
    url: job.url,
    error: job.error,
  };
}

export async function getRenderJob(id: string): Promise<RenderJobRow | null> {
  if (upstashConfigured) {
    try {
      const result = (await upstashCommand(["hgetall", jobKey(id)])) as
        | Record<string, string>
        | null;
      if (!result || !result.id) return null;
      return {
        id: result.id,
        name: result.name ?? "",
        status: result.status ?? "queued",
        url: result.url || null,
        error: result.error || null,
      };
    } catch {
      return null;
    }
  }
  const job = await db.renderJob.findUnique({ where: { id } });
  if (!job) return null;
  return {
    id: job.id,
    name: job.name,
    status: job.status,
    url: job.url,
    error: job.error,
  };
}

async function updateJobRow(
  id: string,
  data: Partial<Pick<RenderJobRow, "status" | "url" | "error">>
): Promise<void> {
  if (upstashConfigured) {
    const segments = ["hset", jobKey(id)];
    if (data.status !== undefined) segments.push("status", data.status);
    if (data.url !== undefined)
      segments.push("url", data.url === null ? "" : data.url);
    if (data.error !== undefined)
      segments.push("error", data.error === null ? "" : String(data.error));
    if (segments.length <= 2) return;
    try {
      await upstashCommand(segments);
    } catch {
      // job row gone — nothing else to do
    }
    return;
  }
  try {
    await db.renderJob.update({ where: { id }, data });
  } catch {
    // job row gone — nothing else to do
  }
}

// ---------------------------------------------------------------------------
// backend 1: Remotion Lambda (serverless renders on AWS)
// ---------------------------------------------------------------------------
const lambdaConfigured = Boolean(
  process.env.REMOTION_LICENSE_KEY &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
);

const lambdaRegion = (): AwsRegion =>
  (process.env.REMOTION_AWS_REGION ||
    process.env.AWS_REGION ||
    "us-east-1") as AwsRegion;

/** presigned download URLs stay valid for two weeks */
const PRESIGN_TTL_SECONDS = 60 * 60 * 24 * 14;

let siteCache: { serveUrl: string; bucketName: string } | null = null;
let functionNameCache: string | null = null;

/** Bundle the site + upload to S3 once per process (diffed upload). */
async function ensureLambdaSite(
  region: AwsRegion
): Promise<{ serveUrl: string; bucketName: string }> {
  if (siteCache) return siteCache;
  const { getOrCreateBucket, deploySiteFromBundle } = await import(
    "@remotion/lambda"
  );
  const { bundle } = await import("@remotion/bundler");
  const { bucketName } = await getOrCreateBucket({ region });
  const bundleDir = await bundle({
    entryPoint: ENTRY_POINT,
    onProgress: () => {},
    webpackOverride: (config) => config,
  });
  const { serveUrl } = await deploySiteFromBundle({
    bucketName,
    region,
    bundleDir,
    siteName: process.env.REMOTION_SITE_NAME || "hyperreel-site",
  });
  siteCache = { serveUrl, bucketName };
  return siteCache;
}

/** Find a compatible render function (env-named preferred), else deploy one. */
async function ensureLambdaFunction(region: AwsRegion): Promise<string> {
  if (functionNameCache) return functionNameCache;
  const { getFunctions, deployFunction } = await import("@remotion/lambda");
  const preferred = process.env.REMOTION_FUNCTION_NAME;
  const fns = await getFunctions({ region, compatibleOnly: true });
  const found = preferred
    ? fns.find((f) => f.functionName === preferred)
    : fns[0];
  if (found) {
    functionNameCache = found.functionName;
    return functionNameCache;
  }
  const created = await deployFunction({
    region,
    createCloudWatchLogGroup: true,
    memorySizeInMb: 2048,
    timeoutInSeconds: 120,
  });
  functionNameCache = created.functionName;
  return functionNameCache;
}

async function runLambdaRenderJob(id: string, name: string): Promise<void> {
  const { renderMediaOnLambda, getRenderProgress, presignUrl } = await import(
    "@remotion/lambda"
  );

  const region = lambdaRegion();
  const { serveUrl, bucketName } = await ensureLambdaSite(region);
  const functionName = await ensureLambdaFunction(region);

  const inputProps = { name };
  const out = await renderMediaOnLambda({
    composition: "HyperReel",
    serveUrl,
    codec: "h264",
    inputProps,
    region,
    functionName,
    downloadBehavior: { type: "download", fileName: null },
  });

  // resolve the final S3 key + presign a 14-day download URL
  const progress = await getRenderProgress({
    renderId: out.renderId,
    bucketName: out.bucketName,
    functionName,
    region,
  });
  const url =
    progress.outKey && progress.outBucket
      ? await presignUrl({
          region,
          bucketName: progress.outBucket,
          objectKey: progress.outKey,
          expiresInSeconds: PRESIGN_TTL_SECONDS,
        })
      : null;

  await updateJobRow(id, {
    status: "done",
    url: url ?? `/api/render/${id}/file`,
    error: null,
  });
}

// ---------------------------------------------------------------------------
// backend 2: local renderer (self-hosted)
// ---------------------------------------------------------------------------
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
    (m.includes("download") && m.includes("browser")) ||
    m.includes("credentials") ||
    m.includes("license key") ||
    m.includes("accessdenied") ||
    m.includes("not authorized") ||
    m.includes("quotaexceeded")
  );
}

export async function runRenderJob(id: string, name: string): Promise<void> {
  try {
    await updateJobRow(id, { status: "rendering" });
    await fs.mkdir(RENDERS_DIR, { recursive: true });

    if (lambdaConfigured) {
      // ---- serverless path: Remotion Lambda on AWS ----
      await runLambdaRenderJob(id, name);
      return;
    }

    // ---- local path: @remotion/bundler + @remotion/renderer ----
    // Dynamic imports: if these fail, the job degrades gracefully.
    const serveUrl = await ensureBundle();
    const { selectComposition, renderMedia } = await import(
      "@remotion/renderer"
    );

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

    await updateJobRow(id, {
      status: "done",
      url: `/api/render/${id}/file`,
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status: RenderJobStatus = isBrowserUnavailableError(message)
      ? "unavailable"
      : "error";
    const friendly =
      status === "unavailable"
        ? `Server rendering is not provisioned in this environment (${message.slice(0, 180)}). On serverless, set REMOTION_LICENSE_KEY + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY (+ optional AWS_REGION / REMOTION_SITE_NAME / REMOTION_FUNCTION_NAME) to route renders through Remotion Lambda; locally, render with the Remotion CLI or a self-hosted server. The in-browser preview stays your live personalized clip.`
        : message.slice(0, 500);
    await updateJobRow(id, { status, error: friendly });
  }
}
