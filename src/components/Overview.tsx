import { useMemo } from 'react'
import { computeOverview } from '../lib/stats'
import { formatR, rClass, type Trade } from '../lib/trades'
import { EquityCurve } from './EquityCurve'

export function Overview({ trades }: { trades: Trade[] }) {
  const stats = useMemo(() => computeOverview(trades), [trades])

  return (
    <section className="overview">
      <div className="tiles">
        <Tile label="Trades" value={String(stats.count)} />
        <Tile label="Total" value={formatR(stats.totalR)} tone={rClass(stats.totalR)} />
        <Tile
          label="Win rate"
          value={stats.winRate === null ? '—' : `${Math.round(stats.winRate * 100)} %`}
        />
        <Tile
          label="R moyen"
          value={stats.avgR === null ? '—' : formatR(stats.avgR)}
          tone={stats.avgR === null ? '' : rClass(stats.avgR)}
        />
        <Tile label="Plus longue série gagnante" value={`${stats.longestWinStreak} trades`} />
        <Tile label="Plus longue série perdante" value={`${stats.longestLossStreak} trades`} />
        <Tile label="Plus forte baisse" value={formatR(stats.maxDrawdown)} tone={rClass(stats.maxDrawdown)} />
      </div>

      <div className="panel">
        <h3>R cumulés</h3>
        <p className="muted">Chaque point est un trade, dans l'ordre chronologique. Clique sur un point pour ouvrir sa fiche.</p>
        <EquityCurve points={stats.curve} />
      </div>
    </section>
  )
}

function Tile({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="tile">
      <span className="muted">{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  )
}
