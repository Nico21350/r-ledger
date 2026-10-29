import { compareValues, type Dimension } from './dimensions'
import { brusselsDay, type Trade } from './trades'

// En dessous de ce nombre de trades, une stat est affichée comme « peu fiable ».
export const MIN_SAMPLE = 5

// Résumé d'un groupe de trades. Seuls les trades avec un RR closed comptent.
export type Summary = {
  count: number
  totalR: number
  avgR: number | null // espérance
  winRate: number | null
  wins: number
  losses: number
  be: number
  profitFactor: number | null // null si ni gain ni perte ; Infinity si aucune perte
  reliable: boolean
}

export function summarize(trades: Trade[]): Summary {
  const rs = trades.map((t) => t.rr_closed).filter((r): r is number => r !== null)
  const count = rs.length
  const totalR = rs.reduce((sum, r) => sum + r, 0)
  const won = rs.filter((r) => r > 0).reduce((sum, r) => sum + r, 0)
  const lost = -rs.filter((r) => r < 0).reduce((sum, r) => sum + r, 0)
  const wins = rs.filter((r) => r > 0).length
  const losses = rs.filter((r) => r < 0).length
  return {
    count,
    totalR,
    avgR: count ? totalR / count : null,
    winRate: count ? wins / count : null,
    wins,
    losses,
    be: count - wins - losses,
    profitFactor: lost > 0 ? won / lost : won > 0 ? Infinity : null,
    reliable: count >= MIN_SAMPLE,
  }
}

export type Group = Summary & { value: string | null; trades: Trade[] }

// Regroupe les trades selon une valeur (instrument, session…), dans l'ordre d'affichage.
export function groupBy(trades: Trade[], get: (t: Trade) => string | null, order?: string[]): Group[] {
  const groups = new Map<string | null, Trade[]>()
  for (const t of trades) {
    const value = get(t)
    groups.set(value, [...(groups.get(value) ?? []), t])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => compareValues(order, a, b))
    .map(([value, list]) => ({ value, trades: list, ...summarize(list) }))
}

export const groupByDimension = (trades: Trade[], dim: Dimension) => groupBy(trades, dim.get, dim.order)

// Grille à deux entrées (jour × session) : une case par combinaison présente.
export type Heatmap = { rows: (string | null)[]; cols: (string | null)[]; cells: Map<string, Group> }

export const cellKey = (row: string | null, col: string | null) => `${row ?? ''}|${col ?? ''}`

export function heatmap(
  trades: Trade[],
  row: { get: (t: Trade) => string | null; order?: string[] },
  col: { get: (t: Trade) => string | null; order?: string[] },
): Heatmap {
  const rows = groupBy(trades, row.get, row.order).map((g) => g.value)
  const cols = groupBy(trades, col.get, col.order).map((g) => g.value)
  const cells = new Map<string, Group>()
  for (const r of groupBy(trades, row.get, row.order)) {
    for (const c of groupBy(r.trades, col.get, col.order)) cells.set(cellKey(r.value, c.value), c)
  }
  return { rows, cols, cells }
}

// Histogramme des R : chaque trade va dans la colonne du multiple de `size` le plus proche
// (avec size = 0,5 : −1 R, 0 R, +0,5 R…). Les colonnes vides entre deux colonnes pleines sont gardées.
export type Bin = { center: number; count: number; trades: Trade[] }

export function histogram(trades: Trade[], size = 0.5): Bin[] {
  const withR = trades.filter((t) => t.rr_closed !== null)
  if (withR.length === 0) return []
  const step = (r: number) => Math.round(r / size)
  const steps = withR.map((t) => step(t.rr_closed!))
  const min = Math.min(...steps)
  const max = Math.max(...steps)
  const bins: Bin[] = []
  for (let s = min; s <= max; s++) {
    const inBin = withR.filter((_, i) => steps[i] === s)
    bins.push({ center: s * size + 0, count: inBin.length, trades: inBin })
  }
  return bins
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Calendrier : le résumé de chaque jour qui a au moins un trade (jour en heure de Bruxelles).
export type CalendarDay = Summary & { day: string; trades: Trade[] }

export function calendarDays(trades: Trade[]): Map<string, CalendarDay> {
  const days = new Map<string, CalendarDay>()
  for (const g of groupBy(trades, (t) => brusselsDay(t.traded_at))) {
    if (g.value) days.set(g.value, { ...g, day: g.value })
  }
  return days
}

const DAY_MS = 24 * 60 * 60 * 1000
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

// Semaines complètes (lundi → dimanche) qui couvrent la période ; une semaine = 7 dates AAAA-MM-JJ.
export function calendarWeeks(from: string, to: string): string[][] {
  const start = toMs(from)
  const mondayOffset = (new Date(start).getUTCDay() + 6) % 7
  const weeks: string[][] = []
  for (let ms = start - mondayOffset * DAY_MS; ms <= toMs(to); ms += 7 * DAY_MS) {
    weeks.push(Array.from({ length: 7 }, (_, i) => toIso(ms + i * DAY_MS)))
  }
  return weeks
}

// Total des R par mois ("2026-05"), dans l'ordre chronologique.
export function monthTotals(days: Map<string, CalendarDay>): { month: string; totalR: number; count: number }[] {
  const months = new Map<string, { totalR: number; count: number }>()
  for (const d of days.values()) {
    const key = d.day.slice(0, 7)
    const m = months.get(key) ?? { totalR: 0, count: 0 }
    months.set(key, { totalR: m.totalR + d.totalR, count: m.count + d.count })
  }
  return [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, m]) => ({ month, ...m }))
}

// « Achievable RR » est du texte libre : "2.5", "RR4", "4 at HTF draw", "Full at 2, Runner at 3", "0 (BE)".
// On garde le plus grand nombre écrit (le meilleur résultat possible) ; null si aucun nombre.
export function parseAchievable(text: string | null): number | null {
  const numbers = text?.match(/\d+(?:[.,]\d+)?/g)?.map((n) => Number(n.replace(',', '.')))
  return numbers?.length ? Math.max(...numbers) : null
}

// R laissés sur la table : ce qui était atteignable moins ce qui a été encaissé.
// Une perte ne « laisse » rien si rien n'était atteignable (atteignable 0 contre −1 R encaissé = 0).
export function leftOnTable(achievable: number, closed: number): number {
  return Math.max(0, achievable - Math.max(0, closed))
}

export type RrPoint = { trade: Trade; achievable: number; closed: number; left: number }

export type RrComparison = {
  points: RrPoint[]
  unreadable: number // trades avec un texte « Achievable RR » sans aucun nombre
  totalLeft: number
  captureRate: number | null // R gagnés ÷ R atteignables, sur les trades où un gain était possible
}

export function compareAchievable(trades: Trade[]): RrComparison {
  const points: RrPoint[] = []
  let unreadable = 0
  for (const trade of trades) {
    if (trade.rr_closed === null || !trade.achievable_rr_text?.trim()) continue
    const achievable = parseAchievable(trade.achievable_rr_text)
    if (achievable === null) {
      unreadable++
      continue
    }
    points.push({ trade, achievable, closed: trade.rr_closed, left: leftOnTable(achievable, trade.rr_closed) })
  }
  const possible = points.filter((p) => p.achievable > 0)
  const reachable = possible.reduce((sum, p) => sum + p.achievable, 0)
  const captured = possible.reduce((sum, p) => sum + Math.max(0, Math.min(p.closed, p.achievable)), 0)
  return {
    points,
    unreadable,
    totalLeft: points.reduce((sum, p) => sum + p.left, 0),
    captureRate: reachable > 0 ? captured / reachable : null,
  }
}

// Effet du stop remonté à BE (colonne « BE » de Notion).
// Perte évitée : le trade aurait perdu 1 R (le risque initial). Gain manqué : le trade aurait rapporté
// son « Achievable RR » ; s'il n'est pas lisible ou vaut 0, on l'estime avec le gain moyen de la période.
export const BE_PREVENTED = 'Prevented loss'
export const BE_MISSED = 'Missed win'

export type BeEffect = {
  prevented: Trade[]
  missed: Trade[]
  savedR: number
  missedR: number
  estimatedMissed: number // nombre de gains manqués estimés avec le gain moyen
  averageWin: number | null
}

export function beEffect(trades: Trade[]): BeEffect {
  const wins = trades.map((t) => t.rr_closed).filter((r): r is number => r !== null && r > 0)
  const averageWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : null
  const prevented = trades.filter((t) => t.be_effect === BE_PREVENTED)
  const missed = trades.filter((t) => t.be_effect === BE_MISSED)
  let estimatedMissed = 0
  const missedR = missed.reduce((sum, t) => {
    const achievable = parseAchievable(t.achievable_rr_text)
    if (achievable !== null && achievable > 0) return sum + achievable
    estimatedMissed++
    return sum + (averageWin ?? 0)
  }, 0)
  return { prevented, missed, savedR: prevented.length, missedR, estimatedMissed, averageWin }
}
