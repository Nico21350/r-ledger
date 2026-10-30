import { expect, test } from '@playwright/test'
import { mockSupabase, signIn } from './fixtures.ts'
import { textOverlaps } from './overlap.ts'

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

// Chaque bulle d'explication « i » s'ouvre entièrement dans l'écran, même près des bords.
for (const path of ['/', '/analyses']) {
  test(`les bulles d'explication restent dans l'écran : ${path}`, async ({ page }) => {
    await page.goto(path)
    const icons = page.locator('.info-tip-icon')
    await expect(icons.first()).toBeVisible()
    const width = page.viewportSize()!.width
    for (const icon of await icons.all()) {
      await icon.focus()
      const bubble = page.locator(`[id="${await icon.getAttribute('aria-describedby')}"]`)
      await expect(bubble).toBeVisible()
      await expect(bubble).toHaveCSS('opacity', '1')
      const box = (await bubble.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      expect(box.y).toBeGreaterThanOrEqual(0)
    }
  })
}

for (const path of ['/', '/analyses', '/trade/t11']) {
  test(`aucun texte de graphique ne se chevauche : ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('main svg').first()).toBeVisible()
    await page.waitForTimeout(1500) // fin des animations
    expect(await textOverlaps(page)).toEqual([])
  })
}

test('la barre du haut garde ses boutons sur téléphone', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Rechercher' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Synchroniser avec Notion' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
})
