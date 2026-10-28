import { useMemo, useState } from 'react'
import { computeOverview } from '../lib/stats'
import { filterTrades, formatR, rClass, type TakenFilter, type Trade } from '../lib/trades'
import { EquityCurve } from './EquityCurve'

const FILTERS: { value: TakenFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'taken', label: 'Pris' },
  { value: 'not_taken', label: 'Non pris' },
]

export function Overview({ trades }: { trades: Trade[] }) {
  const [filter, setFilter] = useState<TakenFilter>('all')
  const stats = useMemo(() => computeOverview(filterTrades(trades, filter)), [trades, filter])

  return (
    <section className="overview">
      <div className="row">
        <h2>Vue d'ensemble</h2>
        <div className="segmented" role="group" aria-label="Filtrer les trades">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={filter === f.value ? 'active' : ''}
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

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
        <p className="muted">Chaque point est un trade, dans l'ordre chronologique.</p>
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
