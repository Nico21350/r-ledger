import type { CurvePoint, Overview as OverviewStats } from '../lib/stats'
import { curveFocus, INDICATORS, type IndicatorId } from '../lib/indicators'
import { formatDate, formatNumber, formatPercent, formatR, rClass } from '../lib/trades'
import { StatTile } from './StatTile'

// Écart entre deux valeurs, sans signe (la flèche ▲▼ le donne déjà).
const rGap = (v: number) => `${v.toLocaleString('fr-BE', { maximumFractionDigits: 2 })} R`
const pointsGap = (v: number) => `${Math.round(v * 100)} pts`
const count = (v: number) => String(Math.round(v))
const tradesCount = (v: number) => `${Math.round(v)} trade${Math.round(v) > 1 ? 's' : ''}`
const number = (v: number) => formatNumber(v)

function sqnLabel(sqn: number | null): string | undefined {
  if (sqn === null) return undefined
  if (sqn < 1.6) return 'Faible'
  if (sqn < 2) return 'Moyen'
  if (sqn < 3) return 'Bon'
  return 'Excellent'
}

// Une carte d'indicateur. onCurve : montrer le passage sur la courbe ; onTrade : ouvrir la fiche d'un trade.
export function IndicatorTile({
  id,
  stats,
  previous,
  onCurve,
  onTrade,
}: {
  id: IndicatorId
  stats: OverviewStats
  previous: OverviewStats | null
  onCurve: (id: IndicatorId) => void
  onTrade: (point: CurvePoint) => void
}) {
  const meta = INDICATORS.find((i) => i.id === id)!
  // Valeur de la période précédente ; undefined = pas de comparaison (aucune période choisie).
  const prev = (pick: (o: OverviewStats) => number | null) => (previous ? pick(previous) : undefined)
  const common = { label: meta.label, hint: meta.hint }
  const curve = curveFocus(stats, id) ? { onClick: () => onCurve(id), actionLabel: 'Voir sur la courbe' } : {}
  const trade = (point: CurvePoint | null) =>
    point
      ? {
          detail: `${point.trade.instrument ?? ''} · ${formatDate(point.trade)}`,
          onClick: () => onTrade(point),
          actionLabel: 'Ouvrir la fiche',
        }
      : {}

  switch (id) {
    case 'avgR':
      return (
        <StatTile {...common} value={stats.avgR} format={formatR} tone={rClass} previous={prev((o) => o.avgR)} formatDelta={rGap}
          info="Ce que rapporte un trade en moyenne, en R. Positive : la stratégie gagne sur la durée." />
      )
    case 'winRate':
      return (
        <StatTile {...common} value={stats.winRate} format={formatPercent} previous={prev((o) => o.winRate)} formatDelta={pointsGap}
          info="Part des trades gagnants (R positif). Un BE ne compte ni comme gain ni comme perte." />
      )
    case 'profitFactor':
      return (
        <StatTile {...common} value={stats.profitFactor} format={number} tone={(v) => (v >= 1 ? 'gain' : 'loss')}
          previous={prev((o) => o.profitFactor)} formatDelta={number}
          info="Total des R gagnés ÷ total des R perdus. Au-dessus de 1, on gagne plus qu'on ne perd." />
      )
    case 'avgWin':
      return (
        <StatTile {...common} value={stats.avgWin} format={formatR} tone={rClass} previous={prev((o) => o.avgWin)} formatDelta={rGap}
          info="R moyen des trades gagnants." />
      )
    case 'avgLoss':
      return (
        <StatTile {...common} value={stats.avgLoss} format={formatR} tone={rClass} previous={prev((o) => o.avgLoss)} formatDelta={rGap}
          info="R moyen des trades perdants. Plus elle est proche de 0, mieux les pertes sont coupées." />
      )
    case 'maxDrawdown':
      return (
        <StatTile {...common} {...curve} value={stats.maxDrawdown} format={formatR} tone={rClass} previous={prev((o) => o.maxDrawdown)}
          formatDelta={rGap} info="La plus grosse chute des R cumulés depuis un sommet (drawdown)."
          detail={
            stats.drawdownRange
              ? `${stats.drawdownRange.from === 0 ? 'Départ' : `Trade n°${stats.drawdownRange.from}`} → n°${stats.drawdownRange.to}`
              : 'Aucune baisse'
          } />
      )
    case 'recoveryFactor':
      return (
        <StatTile {...common} value={stats.recoveryFactor} format={number} previous={prev((o) => o.recoveryFactor)} formatDelta={number}
          info="Total des R ÷ plus forte baisse : combien de fois les gains couvrent la pire baisse." />
      )
    case 'sqn':
      return (
        <StatTile {...common} value={stats.sqn} format={number} tone={(v) => (v >= 2 ? 'gain' : v < 1.6 ? 'loss' : '')}
          previous={prev((o) => o.sqn)} formatDelta={number} detail={sqnLabel(stats.sqn)}
          info="System Quality Number (Van Tharp) : la régularité des résultats. Repères : moins de 1,6 faible, 1,6 à 2 moyen, 2 à 3 bon, plus de 3 excellent." />
      )
    case 'worst':
      return (
        <StatTile {...common} {...trade(stats.worst)} value={stats.worst?.r ?? null} format={formatR} tone={rClass}
          info="Le trade avec le R le plus bas sur la période." />
      )
    case 'count':
      return (
        <StatTile {...common} value={stats.count} format={count} previous={prev((o) => o.count)} higherIsBetter={null} formatDelta={count}
          info="Nombre de trades avec un RR closed sur la période (les filtres s'appliquent)." />
      )
    case 'best':
      return (
        <StatTile {...common} {...trade(stats.best)} value={stats.best?.r ?? null} format={formatR} tone={rClass}
          info="Le trade avec le R le plus haut sur la période." />
      )
    case 'winStreak':
      return (
        <StatTile {...common} {...curve} value={stats.longestWinStreak} format={tradesCount} previous={prev((o) => o.longestWinStreak)}
          formatDelta={count} info="Le plus grand nombre de trades gagnants d'affilée. Un BE interrompt la série." />
      )
    case 'lossStreak':
      return (
        <StatTile {...common} {...curve} value={stats.longestLossStreak} format={tradesCount} previous={prev((o) => o.longestLossStreak)}
          higherIsBetter={false} formatDelta={count}
          info="Le plus grand nombre de trades perdants d'affilée. Un BE interrompt la série." />
      )
    case 'beRate':
      return (
        <StatTile {...common} value={stats.beRate} format={formatPercent} previous={prev((o) => o.beRate)} higherIsBetter={null}
          formatDelta={pointsGap} info="Part des trades clôturés à 0 R (breakeven)." />
      )
  }
}
