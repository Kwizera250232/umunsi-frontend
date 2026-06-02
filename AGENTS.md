# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is

Single **React + Vite + TypeScript** frontend for [Umunsi](https://www.umunsi.com) (Kinyarwanda news/media). The REST API backend (`umunsi-backend`) is **not** in this repository. Local dev expects a separate API process; without it, pages load but show empty-state copy for news/classifieds.

### Standard commands

See `package.json`:

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (default http://localhost:5173) |
| Production build | `npm run build` → `dist/` |
| Preview build | `npm run preview` |
| Lint | `npm run lint` (`bunx tsc --noEmit` + `bunx biome lint --write`) |
| Format | `npm run format` |

**Bun:** Lint/format scripts use `bunx`. Install Bun if missing (`curl -fsSL https://bun.sh/install | bash`, then ensure `~/.bun/bin` is on `PATH`). `npx tsc` / `npx biome` work as substitutes.

**Tests:** No automated test script or test runner in this repo.

### Environment

- Copy or edit `.env` (gitignored). Default in repo: `VITE_API_URL=http://localhost:5000/api`.
- **Port mismatch:** `vite.config.ts` proxies `/api` and `/uploads` to `http://localhost:5003`, while `.env` and `src/services/api.ts` default to port **5000**. Align the running backend with `VITE_API_URL`, or set `VITE_API_URL=/api` and run the API on **5003** so the Vite proxy works.
- Production build forces API base `/api` (see `src/services/api.ts`); Vercel serverless handlers under `/api` proxy to the remote backend.

### Running the dev server (Cloud / headless)

Use a **tmux** session so the server stays up, e.g. session name `vite-dev-server`:

```bash
cd /workspace && npm run dev -- --host 0.0.0.0 --port 5173
```

### Lint caveats

- `npm run lint` currently fails on **pre-existing TypeScript errors** in several admin pages (`FeaturedNews.tsx`, `News.tsx`, etc.). `npm run build` (Vite) still succeeds.
- Do **not** run `biome lint --write` during environment-only setup unless you intend to reformat the codebase (it auto-fixes many files).

### Full E2E (news, login, admin)

Requires the external **umunsi-backend** API (and its database) on the port matching `VITE_API_URL`. Frontend-only verification: homepage, SPA routes (`/news`, `/amatangazo/...`), and `/subscriber-login` form rendering.

### Deploy scripts

PowerShell deploy scripts (`deploy-production-all.ps1`, etc.) target production SSH/PM2 and are not needed for local development.
