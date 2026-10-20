# Architecture notes

## Layers

```
src/
  lib/api/       typed fetch client + Zod schemas for the backend contract (no backend imports)
  lib/queries.ts TanStack Query hooks (public data)
  components/    shared UI (layout, tribute card/reader, portrait, form helpers)
  pages/         public pages; pages/admin/* are lazy-loaded
  experience/    the 3D house (lazy-loaded; the only code that imports three / R3F / drei / gsap)
  test/          Vitest setup, MSW handlers (tests only), fixtures
e2e/             Playwright specs + a route-level API stand-in (tests only)
```

Routing is React Router v7 (`src/router.tsx`). `/experience` and `/admin/*` are lazy routes, so visitors who never enter
the house never download three.js, and the public bundle never includes admin code. `ExperienceRoute` checks WebGL
**before** importing the scene; without WebGL it redirects to `/tributes` with an explanation.

## API client (`src/lib/api/client.ts`)

- Base URL from `VITE_API_BASE_URL`; cookies always included.
- Success envelope `{ data, meta }`, failure envelope `{ error: { code, message, details?, correlationId } }` → `ApiError`.
- Admin mutations fetch `GET /csrf-token` once and send it as `x-csrf-token`; public POSTs need no CSRF.
- `POST /tributes` carries an `Idempotency-Key` that the form keeps across retries (and replaces only after a 409 conflict).
- Uploads: request presigned URL → `PUT` to storage → `POST …/complete`. `503 STORAGE_NOT_CONFIGURED` is surfaced as
  “photo uploads are unavailable” and the visitor can submit without photos.

## Scene state machine (`src/experience/sceneMachine.ts`)

```
exterior ──EXTERIOR_DONE / SKIP──▶ intro ──NEXT / SKIP / ENTER_WALLS──▶ walls[0..n-1] ──NEXT(last)──▶ final
   ▲                                ▲  ◀──PREV (first wall)──┘              │  ▲                        │
   └────────────────────────────────┴───────────────RESTART─────────────────┴──┴────────────────────────┘
                                    GOTO(i): intro / walls / final → any wall
```

| Phase      | Scene | What the visitor sees                                                                 |
| ---------- | ----- | ------------------------------------------------------------------------------------- |
| `exterior` | A     | Scripted approach to the house, door opens, warm fade                                 |
| `intro`    | B     | Memorial room with the portrait, intro card (name + message)                          |
| `walls`    | C     | One wall per relationship category (in the admin-configured order), tribute plaques   |
| *(URL)*    | D     | Reading window, `?read=<tributeId>` layered over the current wall                     |
| `final`    | E     | Final room with the closing message                                                   |

Design decisions:

- **The reducer is pure** and has no Three.js/DOM knowledge, so it is unit-tested directly (`sceneMachine.test.ts`).
- **Stations** (`buildStations`) group tributes by configured category order, then split wide walls into
  `plaquesPerWall(aspect)` plaques (3 landscape, 2 tablet, 1 portrait phone).
- **Reading is URL state, not a phase.** Opening a tribute adds `?read=<id>`; closing (button, Escape, browser Back) removes it.
  The camera is never touched, so you return to exactly the same position. Deep links to `/experience?read=<id>` open the reader over the current view.
- **The camera is driven by `CameraRig`** (GSAP timelines over a proxy pose; no scroll offsets). It reacts to phase/station
  changes only. Skipping/jumping mid-flight kills the running timeline and resets the warm fade.
  - Adjacent walls travel through the connecting arch (via-pose); jumps over more than one wall use a quick fade instead of
    flying through rooms that aren't mounted.
  - `prefers-reduced-motion` (or the in-app toggle) means: start inside at `intro`, every transition is an instant snap, no idle sway.
- **Windowed mounting:** only bays within ±2 (high quality) or ±1 (low quality) of the current wall are mounted.
  The exterior group is hidden once inside. Lights are a constant set whose intensities are lerped (no shader recompiles).
- **Quality:** `detectQuality()` starts mobile/low-core devices on `low` (no shadows, no antialiasing, DPR 1, simpler exterior);
  drei’s `PerformanceMonitor` downgrades at runtime.
- **Resources:** canvas-generated textures (wood, plaques, portrait, labels) are cached and disposed on unmount
  (`disposeSharedTextures`); geometry/material instances are owned by R3F and released with their components.
- **Accessibility parity:** everything reachable in 3D is reachable in the 2D chrome: Previous/Next, “Rooms” jump menu,
  a button per tribute on the current wall, keyboard arrows/PageUp/PageDown, Escape = skip, swipe on touch.
  The sr-only `h1` announces the walkthrough and a live `status` announces the current wall.
- **No audio.** Nothing ever autoplays.

## Admin

`/admin/login` is not linked from public pages. `/admin/*` is guarded by `AdminLayout`, which calls `GET /admin/auth/me`
and redirects to the login on `401`. Emails appear only in admin views. Destructive actions on tributes and gallery items
(reject, delete, remove) go through `ConfirmDialog`. Categories can be hidden but never deleted.

## Testing strategy

- **Vitest + RTL** (jsdom) render the real route table; MSW (tests only) stands in for the API.
- **Playwright** runs against the production build with software WebGL; the API is stubbed at the network layer
  (`e2e/mock-api.ts`). Reduced motion is enabled so tests start inside the house.
