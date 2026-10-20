# House of Memories — frontend

A warm, dignified online memorial: visitors walk through a gentle 3D house, read tributes grouped by how people knew her,
browse photographs and leave their own tribute. The family moderates everything from a private admin area.

Presented by Apus Industries Limited.

**Stack:** pnpm · React 19 (+ React Compiler) · TypeScript · Vite · React Router 7 · TanStack Query · Zod ·
Tailwind CSS v4 · React Three Fiber / three / drei · GSAP · motion · Vitest + Testing Library · Playwright.

This app talks to the API in `../memorial-backend` over HTTP only (no backend source is imported) and ships no fake data in
production code paths.

## Quick start

```bash
pnpm install
cp .env.example .env.local      # optional; the default already points at the local backend
pnpm dev                        # http://localhost:3000
```

Start the backend (`../memorial-backend`, port 4000) first so the memorial has content. The backend’s default
`FRONTEND_ORIGIN` is `http://localhost:3000`, which is why the dev server uses that port.

### Environment variables

| Variable                     | Default                   | Purpose |
| ---------------------------- | ------------------------- | ------- |
| `VITE_API_BASE_URL`          | `/api/v1`                 | API base as seen by the browser (baked in at build time). Use a path for same-origin/proxy, or a full URL for a separate API domain. |
| `VITE_DEV_API_PROXY_TARGET`  | `http://localhost:4000`   | Vite dev/preview proxy target for `/api/*` when `VITE_API_BASE_URL` is a path. |

**Local:** keep `VITE_API_BASE_URL=/api/v1` so the browser talks to the Vite origin; Vite proxies `/api` to the backend (avoids CORS pain).

**Production (separate API domain):** set `VITE_API_BASE_URL=https://api.example.com/api/v1`. The API must allow this site’s origin via CORS **with credentials**, and cookies need `COOKIE_SAMESITE=none` over HTTPS (or put both apps on the same site).

### Scripts

| Script             | What it does                                             |
| ------------------ | -------------------------------------------------------- |
| `pnpm dev`         | Vite dev server on port 3000                             |
| `pnpm build`       | `tsc -b` then production build to `dist/`                |
| `pnpm preview`     | Serve the production build on port 3000                  |
| `pnpm lint`        | oxlint                                                   |
| `pnpm typecheck`   | `tsc -b`                                                 |
| `pnpm test`        | Vitest + React Testing Library (jsdom, MSW)              |
| `pnpm test:e2e`    | Playwright (builds and serves the app on port 4317)      |

Playwright uses its bundled Chromium by default. If that isn’t available for your OS (e.g. older macOS), use an installed
Chrome: `PW_CHANNEL=chrome pnpm test:e2e`. On first use elsewhere: `pnpm exec playwright install chromium`.

## Routes

| Path                                             | Notes                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `/`                                              | Home: title, intro message, “Enter the house”                      |
| `/experience`                                    | 3D walkthrough (lazy). No WebGL → redirect to `/tributes`          |
| `/tributes`, `/tributes/:id`                     | Accessible tribute list and single tribute                         |
| `/gallery`                                       | Photographs/videos (empty and error states handled)                |
| `/submit`                                        | Tribute form                                                       |
| `/admin/login`                                   | Not linked from public pages                                       |
| `/admin`, `/pending`, `/approved`, `/rejected`, `/gallery`, `/media`, `/categories`, `/config`, `/audit` | Protected; redirect to login without a session |

## The 3D house

Five scenes: **A** exterior approach and door → **B** memorial room with portrait → **C** tribute walls, one per relationship
category in the configured order → **D** reading window (URL state `?read=<id>`; Escape/Back/Close return to the same camera
position) → **E** final room. A 2D layer (Previous/Next, “Rooms” menu, per-tribute buttons, keyboard, swipe, Skip) makes
everything reachable without driving the 3D view. No audio is ever played.

- `prefers-reduced-motion` (or the in-app Accessibility toggle) skips the camera flight and starts inside.
- Mobile/low-power devices start in a low-quality mode (no shadows/antialiasing, DPR 1); a performance monitor can downgrade further.
- Everything is procedural, so it works with no art assets. See [`public/assets/README.md`](public/assets/README.md) for dropping in a portrait.
- Design notes and the scene state machine: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Design

Warm ivory surfaces, wood browns and a restrained champagne/bronze accent; Cormorant Garamond headings and Source Sans 3
body text. Tokens are CSS variables in `src/styles/` (exposed to Tailwind through `@theme`).

## Deploying to Vercel

`vercel.json` is included: `pnpm build` → `dist/`, SPA rewrites (everything except `/static/*`, `/assets/*`, favicon goes to
`index.html`), long-lived caching for hashed bundles in `/static/`, and security headers including a CSP.
Set `VITE_API_BASE_URL`, then deploy. Review the CSP `connect-src`/`img-src` if you lock your API and media domains down further.

## Testing

- **Unit/integration (Vitest + RTL):** app init and config, tribute grouping/order, Read More open/close, form validation,
  submit success and failure recovery (Idempotency-Key reuse, 409, 500, 503 uploads), gallery empty/error, accessible navigation,
  admin route protection, the scene state machine, the no-WebGL fallback and the API client.
- **E2E (Playwright, Chrome with software WebGL):** enter the memorial, navigate, open/close a tribute, submit a tribute,
  admin blocked without auth, plus a mobile-viewport pass. The API is stubbed at the network layer in `e2e/mock-api.ts`.

## Production launch checklist

1. Deploy `memorial-backend` first and confirm `GET /api/v1/health` and `/health/ready` succeed.
2. Set `VITE_API_BASE_URL` to the production API (`https://…/api/v1`) and redeploy this frontend.
3. Confirm the API `FRONTEND_ORIGIN` exactly matches this site’s origin (scheme + host + port).
4. Verify cookie auth across origins: if frontend and API are on different sites, backend must use `COOKIE_SAMESITE=none` over HTTPS.
5. Smoke-test: home loads config, Enter House works (or falls back), tributes list, gallery, tribute submit.
6. Confirm `/admin/login` is reachable but not linked from the public footer/nav.
7. Log in as admin, approve a test tribute, confirm it appears publicly and email never appears in public JSON.
8. Configure R2 CORS for this origin; upload a gallery image and a tribute photo; confirm private pending media is not public.
9. Drop family-approved portrait (and optional house photos) into `public/assets/` per that folder’s README; rebuild.
10. Review CSP / media domains if you tighten `connect-src` and `img-src`.
11. Do **not** mark the launch complete until Atlas, R2, bootstrap admin removal, and backup steps in the backend README are done.

## Known limitations

- **No real house model.** The house is built from code. A `.glb` can be introduced, but isn’t loaded today.
- **Tribute photos on 3D plaques need CORS** on the media host (R2/S3) for this site’s origin, because the scene draws them to a
  canvas. Without it plaques show initials; the reading window still shows the photo normally.
- **Admin was verified against mocks and by unit tests only**, not a live backend session with a real cookie/CSRF round trip.
  Confirm login, CSRF and moderation against your deployed API before relying on it.
- **Bundle size:** the 3D chunk is ~1 MB (≈290 kB gzipped) and loads only on `/experience`. The main bundle is ~200 kB gzipped.
- **Software WebGL is slow:** e2e specs that enter the house take 20–40 s in headless Chrome.
- The oxlint run reports React Compiler “immutability” warnings in R3F code (mutating Three objects in `useFrame` is the
  intended pattern there). They are warnings, not errors.
- No audio, no video playback in the 3D scene (videos appear in the 2D gallery only).
