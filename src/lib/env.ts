const raw = import.meta.env.VITE_API_BASE_URL as string | undefined

/**
 * Base URL of the memorial API, including the `/api/v1` prefix. No trailing slash.
 *
 * - Local (default): `/api/v1` — same-origin; Vite proxies to `VITE_DEV_API_PROXY_TARGET`.
 * - Separate API domain: full URL, e.g. `https://api.example.com/api/v1`.
 */
export const API_BASE_URL = (raw && raw.trim() ? raw.trim() : '/api/v1').replace(/\/+$/, '')
