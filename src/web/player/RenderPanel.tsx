"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Film, Loader2, RotateCcw, TriangleAlert } from "lucide-react";

/**
 * Render panel — the server-side render queue UI.
 * POST /api/render {name} → job id → poll GET /api/render/:id.
 * If the headless renderer is unavailable in this environment, the job
 * turns "unavailable" and we show an actionable notice — the in-browser
 * personalized preview (the Player itself) stays the live clip.
 */

interface Job {
  id: string;
  name: string;
  status: string;
  url?: string | null;
  error?: string | null;
}

interface Props {
  name: string;
}

const TERMINAL = new Set(["done", "unavailable", "error"]);

export const RenderPanel: React.FC<Props> = ({ name }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const pollingRef = useRef<Map<string, number>>(new Map());

  const updateJob = (id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const poll = useCallback(async (job: Job, attempt: number) => {
    if (attempt > 120) {
      updateJob(job.id, { status: "error", error: "Timed out waiting for the render." });
      pollingRef.current.delete(job.id);
      return;
    }
    try {
      const res = await fetch(`/api/render/${job.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const data = (await res.json()) as Job;
      updateJob(job.id, { status: data.status, url: data.url, error: data.error });
      if (!TERMINAL.has(data.status)) {
        window.setTimeout(() => void poll(data, attempt + 1), 1500);
      } else {
        pollingRef.current.delete(job.id);
      }
    } catch {
      window.setTimeout(() => void poll(job, attempt + 1), 2500);
    }
  }, []);

  useEffect(() => {
    const timers: number[] = [];
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("bad status");
      const job = (await res.json()) as Job;
      setJobs((prev) => [job, ...prev].slice(0, 8));
      if (!TERMINAL.has(job.status)) {
        void poll(job, 0);
      }
    } catch {
      setJobs((prev) => [
        {
          id: `local-${Date.now()}`,
          name,
          status: "error",
          error: "Could not reach the render API (static hosting?).",
        },
        ...prev,
      ].slice(0, 8));
    } finally {
      setSubmitting(false);
    }
  };

  const latest = jobs[0];

  return (
    <div className="rounded-2xl border border-chrome/15 bg-ink-soft/60 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Film size={16} className="text-acid" />
          <h3 className="mono-label text-[10px] text-chrome">SERVER RENDER QUEUE</h3>
        </div>
        <button
          onClick={submit}
          disabled={submitting}
          className="mono-label flex items-center gap-2 rounded-full bg-acid px-5 py-2.5 text-[10px] font-bold text-ink transition-transform duration-200 hover:scale-[1.03] disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid"
          aria-label="Render a personalized MP4 on the server"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
          RENDER MP4
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-chrome/55">
        Renders <span className="text-acid">{name.trim() || "YOU"}</span> into the 30s
        composition server-side (Remotion renderer → MP4). This in-browser preview is the
        same composition — personalization updates it live.
      </p>

      {latest ? (
        <div className="mt-4 space-y-3" aria-live="polite">
          {latest.status === "done" && latest.url ? (
            <motion.a
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              href={latest.url}
              target="_blank"
              rel="noreferrer"
              className="mono-label flex items-center justify-between gap-3 rounded-xl border border-acid/50 bg-acid/10 px-4 py-3 text-[10px] text-acid transition-colors hover:bg-acid/20"
            >
              <span>READY — {latest.name}&apos;S CLIP</span>
              <span className="flex items-center gap-1">
                DOWNLOAD MP4 <Download size={13} />
              </span>
            </motion.a>
          ) : null}

          {latest.status === "queued" || latest.status === "rendering" ? (
            <div className="rounded-xl border border-chrome/15 bg-ink/70 px-4 py-3">
              <div className="mono-label flex items-center gap-2 text-[10px] text-chrome/80">
                <Loader2 size={13} className="animate-spin text-acid" />
                {latest.status.toUpperCase()} — BUNDLING + RENDERING 900 FRAMES…
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-chrome/10">
                <motion.div
                  className="h-full bg-acid"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                  style={{ width: "40%" }}
                />
              </div>
            </div>
          ) : null}

          {latest.status === "unavailable" ? (
            <div className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3">
              <div className="mono-label flex items-center gap-2 text-[10px] text-coral">
                <TriangleAlert size={13} /> SERVER RENDERER UNAVAILABLE
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-chrome/70">
                {latest.error ?? "Headless Chrome could not be provisioned here."} The
                in-browser preview above <span className="text-acid">is</span> your
                personalized clip — or render locally:{" "}
                <code className="rounded bg-ink px-1.5 py-0.5 text-[10px] text-acid">
                  npx remotion render src/video/index.ts HyperReel out.mp4
                </code>{" "}
                (use Remotion Lambda for production scale).
              </p>
            </div>
          ) : null}

          {latest.status === "error" ? (
            <div className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3">
              <div className="mono-label flex items-center gap-2 text-[10px] text-coral">
                <TriangleAlert size={13} /> RENDER FAILED
              </div>
              <p className="mt-2 text-[11px] text-chrome/70">{latest.error}</p>
              <button
                onClick={submit}
                className="mono-label mt-3 flex items-center gap-2 rounded-full border border-coral/50 px-4 py-2 text-[9px] text-coral transition-colors hover:bg-coral/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-coral"
                aria-label="Retry the render"
              >
                <RotateCcw size={12} /> RETRY
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {jobs.length > 1 ? (
        <div className="hyperreel-scroll mt-4 max-h-36 overflow-y-auto pr-1">
          <ul className="space-y-1.5">
            {jobs.slice(1).map((job) => (
              <li
                key={job.id}
                className="mono-label flex items-center justify-between gap-3 rounded-lg border border-chrome/10 bg-ink/60 px-3 py-2 text-[9px] text-chrome/55"
              >
                <span className="truncate">{job.name || "YOU"} · {job.id.slice(0, 8)}</span>
                <span
                  style={{
                    color:
                      job.status === "done"
                        ? "var(--color-acid)"
                        : TERMINAL.has(job.status)
                          ? "var(--color-coral)"
                          : "rgba(232,232,236,0.6)",
                  }}
                >
                  {job.status.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default RenderPanel;
