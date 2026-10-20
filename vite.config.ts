import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * Local default: browser calls same-origin `/api/v1…` and Vite proxies to the backend.
 * Production (separate API domain): set `VITE_API_BASE_URL=https://api.example.com/api/v1`
 * and leave the proxy unused (absolute URLs are not proxied).
 *
 * Env:
 *   VITE_API_BASE_URL          — API prefix used by the browser (default `/api/v1`)
 *   VITE_DEV_API_PROXY_TARGET  — Node target for the Vite proxy (default `http://localhost:4000`)
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = (env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '')
  const proxyTarget = (env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:4000').replace(/\/+$/, '')
  const useDevProxy = apiBase.startsWith('/')

  const proxy = useDevProxy
    ? {
        // Forward /api (including /api/v1 and /api/docs) to the backend host.
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
        },
      }
    : undefined

  return {
    plugins: [
      tailwindcss(),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    build: {
      // Hashed bundles live in /static so /assets stays free for family-supplied files.
      assetsDir: 'static',
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy,
    },
    preview: {
      port: 3000,
      strictPort: true,
      proxy,
    },
    test: {
      environment: 'jsdom',
      globals: false,
      testTimeout: 30_000,
      hookTimeout: 30_000,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      env: {
        // Tests talk to MSW on an absolute URL (no Vite proxy in vitest).
        VITE_API_BASE_URL: 'http://localhost:4000/api/v1',
      },
    },
  }
})
