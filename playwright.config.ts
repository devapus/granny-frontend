import { defineConfig, devices } from '@playwright/test'

const PORT = 4317
// Set PW_CHANNEL=chrome to use an installed Google Chrome (e.g. on macOS versions the bundled Chromium doesn't support).
const channel = process.env.PW_CHANNEL || undefined

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 30_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    // The 3D house is the point of the app; use software WebGL so it also runs headless/in CI.
    channel,
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  // Serve the production build: it starts faster and is what we ship.
  webServer: {
    command: `pnpm exec vite build && pnpm exec vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
})
