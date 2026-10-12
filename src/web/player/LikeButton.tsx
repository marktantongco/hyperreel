"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";

/**
 * Reaction button — optimistic +1 with a Framer Motion pop,
 * POST /api/reactions; if the API is unreachable (e.g. static export)
 * it silently falls back to localStorage persistence. Never a dead button.
 */

const LS_KEY = "hyperreel-likes";

interface Props {
  variant?: "studio" | "compact";
}

export const LikeButton: React.FC<Props> = ({ variant = "studio" }) => {
  const [count, setCount] = useState<number | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [pops, setPops] = useState<{ id: number }[]>([]);
  const [burst, setBurst] = useState(0);
  const lastClick = useRef(0);

  const readLocal = (): number => {
    const raw = window.localStorage.getItem(LS_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reactions")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad status"))))
      .then((data: { count?: number }) => {
        if (cancelled) return;
        setCount(typeof data.count === "number" ? data.count : 0);
      })
      .catch(() => {
        if (cancelled) return;
        // static hosting / API unavailable → localStorage persistence
        setLocalMode(true);
        setCount(readLocal());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLike = useCallback(() => {
    const now = Date.now();
    if (now - lastClick.current < 250) return; // throttle double-fires
    lastClick.current = now;

    // optimistic pop
    setCount((c) => (c ?? 0) + 1);
    setBurst((b) => b + 1);
    const pop = { id: now };
    setPops((p) => [...p, pop]);
    window.setTimeout(() => {
      setPops((p) => p.filter((x) => x.id !== pop.id));
    }, 700);

    if (localMode) {
      const next = readLocal() + 1;
      window.localStorage.setItem(LS_KEY, String(next));
      return;
    }

    fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "like" }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad status"))))
      .then((data: { count?: number }) => {
        if (typeof data.count === "number") setCount(data.count);
      })
      .catch(() => {
        // network died mid-session → switch to local persistence
        setLocalMode(true);
        const next = readLocal() + 1;
        window.localStorage.setItem(LS_KEY, String(next));
        setCount(next);
      });
  }, [localMode]);

  const display = count ?? "—";

  return (
    <button
      onClick={handleLike}
      aria-label="Like the reel"
      className={`group relative flex items-center gap-3 rounded-full border border-chrome/20 bg-ink-soft/70 transition-colors duration-300 hover:border-coral/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-coral ${
        variant === "compact" ? "px-4 py-2" : "px-6 py-3"
      }`}
    >
      <motion.span
        key={burst}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.45, 1] }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="text-coral"
      >
        <Heart size={variant === "compact" ? 16 : 20} fill="currentColor" strokeWidth={0} />
      </motion.span>

      <AnimatePresence mode="popLayout">
        <motion.span
          key={display}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mono-label text-[11px] text-chrome"
        >
          {display}
        </motion.span>
      </AnimatePresence>

      {/* rising hearts */}
      <AnimatePresence>
        {pops.map((pop) => (
          <motion.span
            key={pop.id}
            initial={{ y: 0, opacity: 1, scale: 0.6 }}
            animate={{ y: -46, opacity: 0, scale: 1.2, rotate: 18 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-coral"
            aria-hidden
          >
            <Heart size={14} fill="currentColor" strokeWidth={0} />
          </motion.span>
        ))}
      </AnimatePresence>

      <span className="mono-label text-[9px] text-chrome/50">
        {localMode ? "LOCAL" : "LIVE"}
      </span>
    </button>
  );
};

export default LikeButton;
