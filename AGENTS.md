# AGENTS.md

## Cursor Cloud specific instructions

- **Package manager:** npm (`package-lock.json`). Install with `npm install` at repo root.
- **Dev server:** `npm run dev -- --host 0.0.0.0 --port 5173` (Vite). API in dev is proxied per `vite.config.ts`; without `umunsi-backend` locally, lists may be empty but the instant shell and skeletons should still render.
- **Build:** `npm run build` (Vite only; `tsc` may fail on pre-existing admin types).
- **Lint:** `bunx biome lint src` if Bun is available.
- **Instant first paint:** `index.html` includes `#umunsi-instant-shell` (removed in `src/main.tsx` when React mounts). `warmSiteData()` in `src/lib/siteBootstrap.ts` prefetches categories and home posts; session caches use `umunsi_categories_v1` and `umunsi_home_cache_v1`.
- **Production API:** Browser traffic uses `/api` (see `vercel.json` / `api/proxy.js`). Do not assume `curl` to production matches browser behavior (bot protection).
