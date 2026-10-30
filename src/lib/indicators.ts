import type { Overview as OverviewStats } from './stats'
import { formatR } from './trades'

// Catalogue des indicateurs : affichés tous dans Analyses, au choix (5 au plus) sur la vue d'ensemble.
export type IndicatorId =
  | 'avgR'
  | 'winRate'
  | 'profitFactor'
  | 'avgWin'
  | 'avgLoss'
  | 'maxDrawdown'
  | 'recoveryFactor'
  | 'sqn'
  | 'worst'
  | 'count'
  | 'best'
  | 'winStreak'
  | 'lossStreak'
  | 'beRate'

export type IndicatorGroup = 'Performance' | 'Risque' | 'Régularité'

// hint : quelques mots simples sous le nom, pour quelqu'un qui ne trade pas.
export const INDICATORS: { id: IndicatorId; group: IndicatorGroup; label: string; hint: string }[] = [
  { id: 'avgR', group: 'Performance', label: 'Espérance', hint: 'gain moyen par trade' },
  { id: 'winRate', group: 'Performance', label: 'Win rate', hint: 'part des trades gagnants' },
  { id: 'profitFactor', group: 'Performance', label: 'Profit factor', hint: 'gains ÷ pertes' },
  { id: 'avgWin', group: 'Performance', label: 'Gain moyen', hint: 'moyenne des trades gagnants' },
  { id: 'avgLoss', group: 'Performance', label: 'Perte moyenne', hint: 'moyenne des trades perdants' },
  { id: 'maxDrawdown', group: 'Risque', label: 'Plus forte baisse', hint: 'pire recul depuis un sommet' },
  { id: 'recoveryFactor', group: 'Risque', label: 'Recovery factor', hint: 'gains ÷ pire baisse' },
  { id: 'sqn', group: 'Risque', label: 'SQN', hint: 'régularité des résultats' },
  { id: 'worst', group: 'Risque', label: 'Pire trade', hint: 'le trade le plus coûteux' },
  { id: 'count', group: 'Régularité', label: 'Trades', hint: 'nombre de trades' },
  { id: 'best', group: 'Régularité', label: 'Meilleur trade', hint: 'le trade le plus rentable' },
  { id: 'winStreak', group: 'Régularité', label: 'Série gagnante max', hint: 'gains d’affilée, au plus' },
  { id: 'lossStreak', group: 'Régularité', label: 'Série perdante max', hint: 'pertes d’affilée, au plus' },
  { id: 'beRate', group: 'Régularité', label: 'Trades à BE', hint: 'trades clôturés à zéro' },
]

export const INDICATOR_GROUPS: IndicatorGroup[] = ['Performance', 'Risque', 'Régularité']
export const DEFAULT_INDICATORS: IndicatorId[] = ['avgR', 'winRate', 'maxDrawdown', 'sqn', 'count']
export const MAX_INDICATORS = 5

// Passage de la courbe concerné par un indicateur (plus forte baisse, séries) ; null s'il n'y en a pas.
export type CurveFocus = { x1: number; x2: number; label: string }
export function curveFocus(stats: OverviewStats, id: IndicatorId): CurveFocus | null {
  if (id === 'maxDrawdown' && stats.drawdownRange) {
    const { from, to } = stats.drawdownRange
    return { x1: from, x2: to, label: `Plus forte baisse : ${formatR(stats.maxDrawdown)}` }
  }
  const streak = id === 'winStreak' ? stats.longestWin : id === 'lossStreak' ? stats.longestLoss : null
  if (!streak) return null
  const name = id === 'winStreak' ? 'Plus longue série gagnante' : 'Plus longue série perdante'
  return { x1: streak.from - 1, x2: streak.to, label: `${name} : trades n°${streak.from} → n°${streak.to}` }
}

// Choix mémorisé gardé tel quel s'il est valide (identifiants connus, 1 à 5) ; sinon le choix par défaut.
export function parseChoice(raw: string | null): IndicatorId[] {
  try {
    const list: unknown = JSON.parse(raw ?? 'null')
    if (!Array.isArray(list)) return DEFAULT_INDICATORS
    const known = list.filter((id): id is IndicatorId => INDICATORS.some((i) => i.id === id))
    const unique = [...new Set(known)].slice(0, MAX_INDICATORS)
    return unique.length ? unique : DEFAULT_INDICATORS
  } catch {
    return DEFAULT_INDICATORS
  }
}
