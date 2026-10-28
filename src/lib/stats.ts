import type { Trade } from './trades'

export type CurvePoint = {
  index: number // numéro du trade dans l'ordre chronologique (1, 2, 3…)
  r: number
  cumR: number
  drawdown: number // écart avec le plus haut sommet atteint jusque-là (0 ou négatif)
  trade: Trade
}

// Série de trades consécutifs gagnants ou perdants, repérée par les numéros de trade (inclus).
export type Streak = { type: 'win' | 'loss'; length: number; from: number; to: number }

export type Overview = {
  count: number
  totalR: number
  winRate: number | null // part des trades en gain, entre 0 et 1
  beRate: number | null // part des trades à 0 R
  avgR: number | null // espérance : ce que rapporte un trade en moyenne
  avgWin: number | null
  avgLoss: number | null
  profitFactor: number | null // Infinity s'il n'y a aucune perte
  sqn: number | null
  recoveryFactor: number | null
  best: CurvePoint | null
  worst: CurvePoint | null
  maxDrawdown: number // plus forte baisse depuis un sommet, en R (0 ou négatif)
  // Plus forte baisse : du numéro du trade au sommet (0 = départ) au numéro du trade au creux.
  drawdownRange: { from: number; to: number } | null
  longestWin: Streak | null
  longestLoss: Streak | null
  longestWinStreak: number
  longestLossStreak: number
  currentStreak: Streak | null // série en cours sur les derniers trades
  streaks: Streak[] // séries d'au moins 3 trades, pour les surligner sur la courbe
  peak: CurvePoint | null // plus haut niveau de R cumulés atteint
  curve: CurvePoint[]
}

const MIN_HIGHLIGHTED_STREAK = 3

// Les trades sans RR closed ne peuvent pas entrer dans les stats en R : ils sont ignorés.
export function computeOverview(trades: Trade[]): Overview {
  const sorted = trades
    .filter((t): t is Trade & { rr_closed: number } => t.rr_closed !== null)
    .sort((a, b) => (a.traded_at ?? '').localeCompare(b.traded_at ?? ''))

  let cumR = 0
  let peakR = 0
  let peakIndex = 0
  let maxDrawdown = 0
  let drawdownRange: Overview['drawdownRange'] = null
  const curve: CurvePoint[] = []

  for (const [i, trade] of sorted.entries()) {
    const index = i + 1
    cumR += trade.rr_closed
    if (cumR > peakR) {
      peakR = cumR
      peakIndex = index
    }
    const drawdown = cumR - peakR
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown
      drawdownRange = { from: peakIndex, to: index }
    }
    curve.push({ index, r: trade.rr_closed, cumR, drawdown, trade })
  }

  const rs = curve.map((p) => p.r)
  const wins = rs.filter((r) => r > 0)
  const losses = rs.filter((r) => r < 0)
  const count = rs.length
  const grossWin = sum(wins)
  const grossLoss = -sum(losses)
  const streaks = findStreaks(curve)
  const longest = (type: Streak['type']) =>
    streaks.filter((s) => s.type === type).reduce<Streak | null>((a, s) => (!a || s.length > a.length ? s : a), null)
  const longestWin = longest('win')
  const longestLoss = longest('loss')
  const last = streaks.at(-1)

  return {
    count,
    totalR: cumR,
    winRate: count ? wins.length / count : null,
    beRate: count ? rs.filter((r) => r === 0).length / count : null,
    avgR: count ? cumR / count : null,
    avgWin: wins.length ? grossWin / wins.length : null,
    avgLoss: losses.length ? -grossLoss / losses.length : null,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null,
    sqn: computeSqn(rs),
    recoveryFactor: maxDrawdown < 0 ? cumR / -maxDrawdown : null,
    best: count ? curve.reduce((a, p) => (p.r > a.r ? p : a)) : null,
    worst: count ? curve.reduce((a, p) => (p.r < a.r ? p : a)) : null,
    maxDrawdown,
    drawdownRange,
    longestWin,
    longestLoss,
    longestWinStreak: longestWin?.length ?? 0,
    longestLossStreak: longestLoss?.length ?? 0,
    currentStreak: last && last.to === count ? last : null,
    streaks: streaks.filter((s) => s.length >= MIN_HIGHLIGHTED_STREAK),
    peak: count ? curve.reduce((a, p) => (p.cumR > a.cumR ? p : a)) : null,
    curve,
  }
}

// Toutes les séries gagnantes et perdantes ; un BE (0 R) interrompt les deux.
function findStreaks(curve: CurvePoint[]): Streak[] {
  const streaks: Streak[] = []
  for (const p of curve) {
    const type = p.r > 0 ? 'win' : p.r < 0 ? 'loss' : null
    const current = streaks.at(-1)
    if (type && current?.type === type && current.to === p.index - 1) {
      current.length++
      current.to = p.index
    } else if (type) {
      streaks.push({ type, length: 1, from: p.index, to: p.index })
    }
  }
  return streaks
}

// SQN (System Quality Number, Van Tharp) : espérance ÷ écart-type × √(nombre de trades, plafonné à 100).
function computeSqn(rs: number[]): number | null {
  if (rs.length < 2) return null
  const mean = sum(rs) / rs.length
  const variance = sum(rs.map((r) => (r - mean) ** 2)) / (rs.length - 1)
  if (variance === 0) return null
  return (Math.sqrt(Math.min(rs.length, 100)) * mean) / Math.sqrt(variance)
}

export type RollingPoint = { index: number; expectancy: number; winRate: number }

// Espérance et win rate sur les `window` derniers trades, à chaque trade (dès que la fenêtre est pleine).
export function rollingStats(curve: CurvePoint[], window: number): RollingPoint[] {
  const points: RollingPoint[] = []
  for (let i = window - 1; i < curve.length; i++) {
    const slice = curve.slice(i - window + 1, i + 1).map((p) => p.r)
    points.push({
      index: curve[i].index,
      expectancy: sum(slice) / window,
      winRate: slice.filter((r) => r > 0).length / window,
    })
  }
  return points
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}
