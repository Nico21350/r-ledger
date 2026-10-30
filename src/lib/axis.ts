// Graduations « rondes » d'un axe (pas de 1, 2, 2,5 ou 5 × 10ⁿ) qui couvrent [min, max],
// et nombre de décimales à afficher pour que deux graduations n'aient jamais le même libellé.
export function niceTicks(min: number, max: number, target = 5): { ticks: number[]; decimals: number } {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 0.5
    min -= pad
    max += pad
  }
  const rough = (max - min) / (target - 1)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const norm = rough / magnitude
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  const step = factor * magnitude
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9)) + (factor === 2.5 ? 1 : 0)
  const ticks: number[] = []
  for (let v = Math.floor(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(Number(v.toFixed(decimals + 2)))
  if (ticks.at(-1)! < max) ticks.push(Number((ticks.at(-1)! + step).toFixed(decimals + 2)))
  return { ticks, decimals }
}

// Libellé d'axe en R, avec le même signe moins (−) que le reste de l'application.
export function axisR(value: number, decimals = 1): string {
  const text = Math.abs(value).toLocaleString('fr-BE', { maximumFractionDigits: decimals })
  return `${value < 0 ? '−' : ''}${text} R`
}
