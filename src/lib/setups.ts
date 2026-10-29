import { summarize, MIN_SAMPLE, type Summary } from './analysis'
import { DIMENSIONS, type DimensionKey } from './dimensions'
import type { Trade } from './trades'

// Un setup = une combinaison de critères, par exemple { session: 'NY-2', htf: 'H1' }.
export type Setup = Partial<Record<DimensionKey, string>>

export function matchesSetup(trade: Trade, setup: Setup): boolean {
  return DIMENSIONS.every((d) => setup[d.key] === undefined || d.get(trade) === setup[d.key])
}

export type RankedSetup = Summary & { setup: Setup; trades: Trade[] }

// Toutes les combinaisons d'un ou deux critères qui réunissent au moins MIN_SAMPLE trades,
// classées par espérance (puis par nombre de trades). Les valeurs « non renseigné » sont ignorées.
export function rankSetups(trades: Trade[], minCount = MIN_SAMPLE): RankedSetup[] {
  const dims = DIMENSIONS.filter((d) => d.key !== 'pris')
  const groups = new Map<string, { setup: Setup; trades: Trade[] }>()
  const add = (setup: Setup, trade: Trade) => {
    const key = JSON.stringify(setup)
    const group = groups.get(key) ?? { setup, trades: [] }
    group.trades.push(trade)
    groups.set(key, group)
  }
  for (const t of trades) {
    if (t.rr_closed === null) continue
    const values = dims.flatMap((d) => {
      const v = d.get(t)
      return v === null ? [] : [[d.key, v] as const]
    })
    values.forEach(([k1, v1], i) => {
      add({ [k1]: v1 }, t)
      for (const [k2, v2] of values.slice(i + 1)) add({ [k1]: v1, [k2]: v2 }, t)
    })
  }
  // Une combinaison qui réunit exactement les mêmes trades qu'une combinaison plus simple n'apprend rien de plus.
  const simplest = new Map<string, { setup: Setup; trades: Trade[] }>()
  for (const g of groups.values()) {
    if (g.trades.length < minCount) continue
    const ids = g.trades.map((t) => t.id).join(',')
    const known = simplest.get(ids)
    if (!known || Object.keys(g.setup).length < Object.keys(known.setup).length) simplest.set(ids, g)
  }
  return [...simplest.values()]
    .map((g) => ({ ...g, ...summarize(g.trades) }))
    .sort((a, b) => (b.avgR ?? 0) - (a.avgR ?? 0) || b.count - a.count)
}
