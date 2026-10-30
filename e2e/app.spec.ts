import { expect, test } from '@playwright/test'
import { mockSupabase, signIn } from './fixtures.ts'
import { textOverlaps } from './overlap.ts'

// Noms des cartes d'indicateurs, suivis du « i » de leur bulle d'explication.
const labels = (...names: string[]) => names.map((n) => new RegExp(`^${n}i?$`))

test.beforeEach(async ({ context }) => {
  await mockSupabase(context)
})

test("sans session, l'écran de connexion s'affiche", async ({ page }) => {
  await page.goto('/analyses')
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
  await expect(page.getByLabel('Mot de passe')).toBeVisible()
})

test.describe('connecté', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test("vue d'ensemble : total, constats sur une ligne, 5 indicateurs par défaut", async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.hero-value')).toHaveText('+13 R')
    await expect(page.getByText('12 trades · 58 % gagnants')).toBeVisible() // 7 gains sur 12
    await expect(page.getByText('1 R = le montant risqué sur un trade')).toBeVisible()
    await expect(page.locator('.insight-strip')).toContainText('Point fort')
    await expect(page.getByRole('link', { name: 'Voir tous les constats →' })).toBeVisible()
    await expect(page.locator('.overview-side .tile-label')).toHaveText(labels('Espérance', 'Win rate', 'Plus forte baisse', 'SQN', 'Trades'))
    await expect(page.locator('.tile', { hasText: 'Win rate' })).toContainText('58 %')
    await expect(page.locator('.tile', { hasText: 'Win rate' })).toContainText('part des trades gagnants')
  })

  test('derniers trades : 4 cartes, du plus récent au plus ancien ; un clic ouvre la fiche', async ({ page }) => {
    await page.goto('/')
    const cards = page.locator('.recent-trade')
    await expect(cards).toHaveCount(4)
    await expect(cards.first()).toContainText('Pas de capture') // t12 n'a pas de capture
    await expect(cards.first()).toContainText('−1 R')
    await cards.nth(1).click() // t11
    await expect(page).toHaveURL(/\/trade\/t11/)
  })

  // Règle du projet : tout est en R, aucun montant ne doit apparaître.
  for (const path of ['/', '/analyses', '/galerie', '/trade/t11', '/comparer/t10/t11']) {
    test(`aucun montant en dollars ou en euros : ${path}`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('main h2').first()).toBeVisible()
      await page.waitForTimeout(500)
      expect(await page.locator('body').innerText()).not.toMatch(/[$€]|\bUSD\b|\bEUR\b/)
    })
  }

  test('le menu Filtres filtre toute l’application, la pastille retire le filtre', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Filtres' }).click()
    await page.getByRole('dialog', { name: 'Filtres' }).getByRole('button', { name: 'YM1!' }).click()
    await expect(page).toHaveURL(/instrument=YM1/)
    await page.keyboard.press('Escape')
    await expect(page.locator('.hero-value')).toHaveText('+1 R')
    await page.getByRole('button', { name: /Retirer le filtre YM1!/ }).click()
    await expect(page.locator('.hero-value')).toHaveText('+13 R')
    await expect(page).not.toHaveURL(/instrument=/)
  })

  test('Personnaliser : le choix des indicateurs est gardé ; « Meilleur trade » ouvre la fiche', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Personnaliser' }).click()
    const picker = page.getByRole('dialog', { name: 'Indicateurs affichés' })
    // 5 déjà choisis : les autres sont grisés tant qu'on n'en retire pas un.
    await expect(picker.getByRole('button', { name: 'Meilleur trade' })).toBeDisabled()
    await picker.getByRole('button', { name: 'Trades', exact: true }).click()
    await picker.getByRole('button', { name: 'Meilleur trade' }).click()
    await page.reload()
    await expect(page.locator('.overview-side .tile-label')).toHaveText(
      labels('Espérance', 'Win rate', 'Plus forte baisse', 'SQN', 'Meilleur trade'),
    )
    await page.locator('.tile', { hasText: 'Meilleur trade' }).getByRole('button', { name: /Ouvrir la fiche/ }).click()
    await expect(page).toHaveURL(/\/trade\/t11/)
    await expect(page.locator('.trade-hero .hero-value')).toHaveText('+3,5 R')
    await expect(page.getByText('Trade 11 sur 12')).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page).toHaveURL(/\/trade\/t10/)
    await expect(page.locator('.trade-hero .hero-value')).toHaveText('+2 R')
  })

  test('« Voir tous les constats » mène aux constats des Analyses ; les 14 indicateurs y sont', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Voir tous les constats →' }).click()
    await expect(page).toHaveURL(/\/analyses.*#constats/)
    await expect(page.getByRole('heading', { name: 'Constats' })).toBeVisible()
    await expect(page.locator('#croisements .panel-lede')).toHaveText('Les résultats découpés selon chaque critère noté dans le journal.')
    await expect(page.locator('#indicateurs .tile')).toHaveCount(14)
    await expect(page.getByText('Forme récente')).toHaveCount(0)
  })

  test('Analyses : « Voir sur la courbe » ramène à la vue d’ensemble, zoomée sur le passage', async ({ page }) => {
    await page.goto('/analyses')
    await page.locator('#indicateurs .tile', { hasText: 'Série gagnante max' }).getByRole('button', { name: /Voir sur la courbe/ }).click()
    await expect(page).toHaveURL(/localhost:\d+\/$/)
    await expect(page.getByText(/Plus longue série gagnante : trades n°/)).toBeVisible()
  })

  test('aucun texte de graphique ne se chevauche, pour chaque critère des Croisements', async ({ page }) => {
    test.setTimeout(120_000) // 36 combinaisons, chacune avec son animation
    await page.goto('/analyses')
    const chips = page.locator('#croisements .dim-chip')
    await expect(chips.first()).toBeVisible()
    for (const metric of ['Total R', 'Espérance', 'Win rate']) {
      await page.locator('#croisements').getByRole('radio', { name: metric }).click()
      for (const chip of await chips.all()) {
        await chip.click()
        await page.waitForTimeout(700) // fin de l'animation des barres
        expect(await textOverlaps(page), `${await chip.innerText()} / ${metric}`).toEqual([])
      }
    }
  })

  test('Analyses : croisements, tri, et liste des trades dans le panneau latéral', async ({ page }) => {
    await page.goto('/analyses')
    const table = page.locator('#croisements .data-table')
    await expect(table.locator('tbody tr')).toHaveCount(3) // NY-1, NY-2, NY-3
    await page.getByRole('radio', { name: 'Instrument' }).click()
    await expect(table.locator('tbody tr').first()).toContainText('ES1!')
    await table.getByRole('button', { name: /Total R/ }).click()
    await expect(table.locator('tbody tr').first()).toContainText('NQ1!')
    await table.locator('tbody tr', { hasText: 'NQ1!' }).click()
    const drawer = page.getByRole('dialog', { name: 'Instrument : NQ1!' })
    await expect(drawer).toBeVisible()
    await expect(drawer.locator('.drawer-trade')).toHaveCount(7)
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })

  test('recherche Ctrl+K : un mot de la narrative ouvre le bon trade', async ({ page }) => {
    await page.goto('/')
    await page.locator('.hero-value').waitFor()
    await page.keyboard.press('Control+k')
    await page.getByRole('combobox', { name: 'Rechercher' }).fill('patience')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/trade\/t08/)
    await expect(page.locator('.trade-hero .hero-value')).toHaveText('+2,5 R')
  })

  test('galerie : une carte par jour, plein écran avec les flèches', async ({ page }) => {
    await page.goto('/galerie')
    const cards = page.locator('.gallery-item')
    await expect(cards).toHaveCount(2)
    await expect(cards.first()).toContainText('2 captures')
    await cards.first().click()
    const counter = page.locator('.lightbox-bar .toolbar .muted')
    await expect(counter).toHaveText('1 / 2')
    await page.keyboard.press('ArrowRight')
    await expect(counter).toHaveText('2 / 2')
    await page.keyboard.press('Escape')
    await expect(page.locator('.lightbox')).toBeHidden()
  })

  test('comparer deux trades : les différences sont comptées', async ({ page }) => {
    await page.goto('/comparer/t10/t11')
    await expect(page.locator('.compare-head h3')).toHaveText(['NQ1! SELL', 'NQ1! SELL'])
    await expect(page.getByText(/différences? sur 13 propriétés/)).toBeVisible()
    await page.getByRole('button', { name: '⇄ Inverser' }).click()
    await expect(page).toHaveURL(/\/comparer\/t11\/t10/)
  })

  test('export CSV des trades filtrés', async ({ page }) => {
    await page.goto('/')
    await page.locator('.hero-value').waitFor()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /CSV/ }).click()])
    expect(download.suggestedFilename()).toMatch(/^r-ledger-vue-ensemble-\d{4}-\d{2}-\d{2}\.csv$/)
    const content = await (await download.createReadStream()).toArray()
    const csv = Buffer.concat(content).toString('utf8')
    expect(csv.split('\r\n').filter(Boolean)).toHaveLength(13) // en-tête + 12 trades
    expect(csv).toContain(';3,5;')
  })
})

test('« Voir la démo » ouvre le mode démo, sans synchronisation possible', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Voir la démo' }).click()
  await expect(page.locator('.hero-value')).toHaveText('+13 R')
  await expect(page.getByText('Mode démo · lecture seule')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Synchroniser avec Notion' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Quitter la démo' })).toBeVisible()
  // L'action « Synchroniser » n'est pas proposée non plus dans la recherche Ctrl+K.
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Rechercher' }).fill('synchro')
  await expect(page.getByText('Aucun résultat pour « synchro »')).toBeVisible()
})
