import { defineConfig, devices } from '@playwright/test'

// Tests de bout en bout : un vrai navigateur ouvre l'application et clique comme un utilisateur.
// L'application est lancée avec une fausse adresse Supabase (e2e.supabase.test) : toutes les réponses
// viennent de e2e/fixtures.ts. Ni le vrai compte, ni la vraie base, ni Notion ne sont utilisés.
const PORT = 5174

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // Temps laissé à chaque vérification (le tout premier chargement de l'application peut prendre quelques secondes).
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'fr-BE',
    timezoneId: 'Europe/Brussels',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'telephone', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  // Les tests tournent sur la version construite de l'application (plus rapide et plus stable que le serveur de développement),
  // dans un dossier à part (dist-e2e) pour ne pas mélanger avec la vraie version.
  webServer: {
    command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    // Ces valeurs remplacent celles du fichier .env pendant les tests.
    env: {
      VITE_SUPABASE_URL: 'https://e2e.supabase.test',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'cle-de-test',
    },
  },
})
