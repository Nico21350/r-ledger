import type { Page } from '@playwright/test'

// Textes de graphiques qui se chevauchent ou qui sortent de leur graphique (liste vide = tout est lisible).
export function textOverlaps(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = []
    for (const svg of document.querySelectorAll('main svg')) {
      const frame = svg.getBoundingClientRect()
      if (frame.width < 40) continue
      const texts = [...svg.querySelectorAll('text')]
        .filter((t) => t.textContent?.trim())
        .map((t) => ({ text: t.textContent!.trim(), box: t.getBoundingClientRect() }))
        .filter((t) => t.box.width > 0)
      texts.forEach((a, i) => {
        const outside = a.box.left < frame.left - 2 || a.box.right > frame.right + 2 || a.box.top < frame.top - 2 || a.box.bottom > frame.bottom + 2
        if (outside) problems.push(`« ${a.text} » sort du graphique`)
        for (const b of texts.slice(i + 1)) {
          const x = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left)
          const y = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top)
          if (x > 1 && y > 1) problems.push(`« ${a.text} » chevauche « ${b.text} »`)
        }
      })
    }
    return problems
  })
}
