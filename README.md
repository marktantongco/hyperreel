# HYPERREEL

**A GenZ 3D motion studio site where one choreography drives two renderers.**
The landing page is a pinned, scroll-scrubbed real-time Three.js cinematic in 5 acts; the exact same scene code is a
[Remotion](https://remotion.dev) composition — playable in a fully custom in-browser player, renderable server-side to
MP4, and personalizable (your name is composited into the CTA act).

> WE MAKE THE INTERNET FLINCH.

- **Landing (`/`)** — GSAP `ScrollTrigger` master timeline (scrubbed) flies the camera along a CatmullRom path through
  5 acts: Hero → Kinetic Type → Studio Reel → Chrome Grid → CTA. Post FX (Bloom, ChromaticAberration, Noise),
  custom cursor, magnetic buttons, film grain, marquee strips, scramble type.
- **Studio (`/studio`)** — the cinematic as a Remotion `<Player>` with **100% custom chrome** (play/pause, drag
  scrubber, chapter markers, volume popup, fullscreen, live name personalization, reaction counter, server render
  queue).
- **APIs** — `/api/reactions` (like counter, SQLite), `/api/render` (+`/:id`, `/:id/file`) render queue,
  `/api/health`, `opengraph-image` routes via `next/og`.

## Architecture

```
                         ONE CHOREOGRAPHY, TWO RENDERERS
                                        │
              ┌─────────────────────────┴──────────────────────────┐
              │  progress 0→1 (pure, deterministic, seeded random) │
              └────────┬───────────────────────────┬───────────────┘
                       │                           │
        ┌──────────────▼──────────────┐  ┌─────────▼─────────────────┐
        │  REMOTION (src/video)       │  │  LANDING (src/web/canvas) │
        │  useCurrentFrame()/900      │  │  GSAP ScrollTrigger scrub │
        │  <ThreeCanvas> @remotion/three  │  <Canvas> react-three-fiber
        │  DOM overlays + film HUD    │  │  (fixed bg, pinned acts)  │
        └──────┬──────────────────────┘  └─────────┬─────────────────┘
               │                                    │
               └────────────┬───────────────────────┘
                            ▼
        ┌──────────────────────────────────────────────────────┐
        │ src/video/scenes — pure THREE.SceneBundles           │
        │ hero / kinetic / reel / grid / cta + env + simplex   │
        │ src/video/drivers — masterDriver (CatmullRom cam)    │
        │ src/shared/acts.ts — the act table (frames, colors)  │
        └──────────────────────────────────────────────────────┘

  src/web (framer-motion: DOM chrome ONLY)     src/server (route logic)
  ├── landing/   scroll rig + overlays + HUD   ├── reactions.ts
  ├── player/    custom Remotion player chrome └── render.ts (@remotion/renderer)
  └── components/ nav, cursor, marquee, …      prisma (SQLite: db/custom.db)

  src/app — thin routes: page.tsx, studio/, api/{reactions,render,health},
            opengraph-image.tsx (next/og)
```

## Zero-overlap doctrine

| Land | Owner | Rules |
|---|---|---|
| `src/video/` | Remotion + Three.js + GSAP | **No framer-motion.** Pure, deterministic scenes (`SceneBundle` = `{group, update(progress), dispose()}`), pure drivers, no clocks/RAF/`Math.random` — all randomness is seeded via `random()` from `remotion`. |
| `src/web/` | Framer Motion | DOM chrome only (nav, buttons, sliders, overlays, cursor, popups). Never wraps or animates the `<Player>`/canvas element; talks to it one-way via Context/progress store → refs. |
| `src/shared/` | — | Act table, easing registry, tokens, scramble util, Theatre JSON (camera control points live in `src/shared/theatre/landing.json` — edit the JSON to retune the landing camera). |
| `src/server/` | — | Route-handler logic: reactions upsert, render pipeline. |
| `src/app/` | — | Thin routes only. |

Determinism is enforced: `bun run scripts/hyperreel-determinism.ts` renders frame 120 (and friends) twice and
asserts byte-identical snapshots.

## Run

```bash
bun install
bun run db:push          # SQLite → db/custom.db
bun run dev              # http://localhost:3000
```

Quality gates: `bun run lint`, `bunx tsc --noEmit`, `bun run scripts/hyperreel-determinism.ts`.

## Render video

**In-browser studio** — open `/studio`, type a name, press play. That *is* the live personalized clip.

**Remotion CLI (local)**

```bash
bunx remotion studio src/video/index.ts      # Remotion Studio at :3000-style port
bunx remotion render src/video/index.ts HyperReel out/hyperreel.mp4 \
  --props='{"name":"YOU"}'                   # 1920×1080, 30fps, 900 frames
```

**Server API (this app)**

```bash
curl -X POST localhost:3000/api/render -d '{"name":"ADA"}' -H 'content-type: application/json'
curl localhost:3000/api/render/<id>          # poll: queued → rendering → done
curl -o ada.mp4 localhost:3000/api/render/<id>/file
```

If the environment has no headless Chrome for Remotion, jobs land in `status: "unavailable"` with an actionable
message (the UI keeps the in-browser preview and shows local/Lambda guidance).

## Deploy

- **Vercel (recommended)** — import repo, add `DATABASE_URL=file:./db/custom.db` (or switch to Turso/Postgres),
  run `bun run db:push` once. `/api/render` works where a headless Chrome is available; otherwise it degrades to
  `unavailable` as designed.
- **Remotion Lambda (rendering at scale)** — deploy the same entry (`src/video/index.ts`) with
  `npx remotion lambda`, then call `renderMediaOnLambda` from `/api/render` instead of the local renderer.
- **GitHub Pages (static)** — one-time repo step: *Settings → Pages → Deploy from branch → `gh-pages`* — then:

  ```bash
  bash scripts/hyperreel-build-pages.sh   # → PAGES EXPORT READY: out/
  # push out/ to the gh-pages branch (git subtree push / ghp-import)
  ```

  The script stashes `src/app/api` (not exportable), builds with `NEXT_OUTPUT=export` + `basePath: /hyperreel`,
  restores the API, and adds `public/.nojekyll` + `404.html`. On static hosting the like button falls back to
  `localStorage` and the render panel shows its offline notice — no dead UI.

---

HYPERREEL © 2026 · MADE AT 60FPS · EST. 2026
