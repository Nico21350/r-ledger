import { expect, test } from '@playwright/test'
import { mockSupabase, signIn } from './fixtures.ts'

// Sur téléphone : aucun écran ne doit défiler sur le côté, et la barre du haut reste utilisable.
test.beforeEach(async ({ context, page }) => {
  await mockSupabase(context)
  await signIn(page)
})

for (const path of ['/', '/analyses', '/galerie', '/trade/t11', '/comparer/t10/t11']) {
  test(`pas de défilement horizontal : ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('main')).not.toBeEmpty()
    await page.waitForTimeout(800)
    await page.evaluate(() => window.scrollTo(1000, 0))
    expect(await page.evaluate(() => window.scrollX)).toBe(0)
  })
}

test('la barre du haut garde ses boutons sur téléphone', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Rechercher' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Synchroniser avec Notion' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
})
