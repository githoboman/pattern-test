# Astra Pattern Studio — Standalone Tailor Testing Showcase

This repository is a clean, self-contained clone of the **Astra Pattern Studio & Tailor Spec Sheet** experience extracted specifically for tailor testing and stakeholder review.

## What Is Included

- `src/app/pattern/page.tsx` — Complete 3-step Pattern Studio frontend (Design & Style Upload -> Guided Size/Measurements & Anatomy -> Interactive CAD Pattern Blueprint, Fabric Yardage Optimizer, and Tailor Tech Pack / SVG / DXF / Printable Sheet exports).
- `src/app/page.tsx` & `src/app/creator/pattern/page.tsx` — Entry routes rendering Pattern Studio directly at `/`, `/pattern`, and `/creator/pattern`.
- `public/` — Only the fonts (`ClashGrotesk`, `HelveticaNeue`) and sample outfit assets used by Pattern Studio.
- `pattern-engine/` — Standalone FastAPI + Python deterministic pattern drafting engine (optional backend reference; the frontend runs 100% client-side even without a backend server).

## Quick Start (Frontend)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploying a Live Test Link for Tailors (Recommended: Vercel)

1. Push this repository to a new GitHub repo.
2. Import the repository in [Vercel](https://vercel.com/new) (Framework Preset: **Next.js**, Root Directory: `./`).
3. Click **Deploy** — no environment variables are required for full interactive frontend testing.

## Optional: Connecting the Python Pattern Engine

If you also deploy `pattern-engine/` separately (e.g. on Render), set the environment variable:

```env
NEXT_PUBLIC_PATTERN_API_URL=https://your-pattern-engine.onrender.com
```

