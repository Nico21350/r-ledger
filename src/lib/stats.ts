import type { Trade } from './trades'

export type CurvePoint = {
  index: number // numéro du trade dans l'ordre chronologique (1, 2, 3…)
  r: number
  cumR: number
  trade: Trade
}

export type Overview = {
  count: number
  totalR: number
  winRate: number | null // part des trades en gain, entre 0 et 1
  avgR: number | null
  longestWinStreak: number
  longestLossStreak: number
  maxDrawdown: number // plus forte baisse depuis un sommet, en R (0 ou négatif)
  curve: CurvePoint[]
}

// Les trades sans RR closed ne peuvent pas entrer dans les stats en R : ils sont ignorés.
export function computeOverview(trades: Trade[]): Overview {
  const sorted = trades
    .filter((t): t is Trade & { rr_closed: number } => t.rr_closed !== null)
    .sort((a, b) => (a.traded_at ?? '').localeCompare(b.traded_at ?? ''))

  let cumR = 0
  let peak = 0
  let maxDrawdown = 0
  let winStreak = 0
  let lossStreak = 0
  let longestWinStreak = 0
  let longestLossStreak = 0
  const curve: CurvePoint[] = []

  for (const [i, trade] of sorted.entries()) {
    const r = trade.rr_closed
    cumR += r
    peak = Math.max(peak, cumR)
    maxDrawdown = Math.min(maxDrawdown, cumR - peak)

    // Un BE (0 R) interrompt les deux séries.
    winStreak = r > 0 ? winStreak + 1 : 0
    lossStreak = r < 0 ? lossStreak + 1 : 0
    longestWinStreak = Math.max(longestWinStreak, winStreak)
    longestLossStreak = Math.max(longestLossStreak, lossStreak)

    curve.push({ index: i + 1, r, cumR, trade })
  }

  const count = sorted.length
  return {
    count,
    totalR: cumR,
    winRate: count ? sorted.filter((t) => t.rr_closed > 0).length / count : null,
    avgR: count ? cumR / count : null,
    longestWinStreak,
    longestLossStreak,
    maxDrawdown,
    curve,
  }
}
