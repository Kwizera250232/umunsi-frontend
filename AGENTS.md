# AGENTS.md

## Cursor Cloud specific instructions

- **Package manager:** npm (`package-lock.json`). Install with `npm install` at repo root.
- **Dev server:** `npm run dev -- --host 0.0.0.0 --port 5173` (Vite). API in dev is proxied per `vite.config.ts`; without `umunsi-backend` locally, lists may be empty but the instant shell and skeletons should still render.
- **Build:** `npm run build` (Vite only; `tsc` may fail on pre-existing admin types).
- **Lint:** `bunx biome lint src` if Bun is available.
- **Data prefetch:** `warmSiteData()` in `src/lib/siteBootstrap.ts` runs from `src/main.tsx` on load; session caches use `umunsi_categories_v1` and `umunsi_home_cache_v1`.
- **Backend port mismatch:** `.env` sets `VITE_API_URL=http://localhost:5000/api`, but `vite.config.ts` proxies `/api` and `/uploads` to `localhost:5003`. Align these when running `umunsi-backend` locally.
- **Tests:** No automated test suite in this repo (`npm run lint` runs `tsc` + Biome; `tsc` fails on pre-existing admin type errors — use `bunx biome lint src` for lint-only checks).
- **Production API:** Browser traffic uses `/api` (see `vercel.json` / `api/proxy.js`). Do not assume `curl` to production matches browser behavior (bot protection).
