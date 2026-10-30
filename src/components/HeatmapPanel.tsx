import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { cellKey, heatmap, summarize, type Group } from '../lib/analysis'
import { brusselsHour, DIMENSION_BY_KEY } from '../lib/dimensions'
import { riseIn } from '../lib/motion'
import { heatColor } from '../lib/theme'
import { formatPercent, formatR, rClass, type Trade } from '../lib/trades'
import { InfoTip } from './InfoTip'
import { Segmented } from './Segmented'
import type { DrawerContent } from './TradeDrawer'

type Columns = 'session' | 'heure'
type Metric = 'totalR' | 'avgR'

const COLUMNS: { value: Columns; label: string }[] = [
  { value: 'session', label: 'Session' },
  { value: 'heure', label: 'Heure' },
]

const METRICS: { value: Metric; label: string }[] = [
  { value: 'totalR', label: 'Total R' },
  { value: 'avgR', label: 'Espérance' },
]

const hour = { get: brusselsHour } // ordre « numérique » : 9h avant 15h

// Carte de chaleur : jours de la semaine en lignes, sessions (ou heures de Bruxelles) en colonnes.
export function HeatmapPanel({ trades, onOpen }: { trades: Trade[]; onOpen: (content: DrawerContent) => void }) {
  const [columns, setColumns] = useState<Columns>('session')
  const [metric, setMetric] = useState<Metric>('totalR')
  const [hovered, setHovered] = useState<{ row: string; col: string; group: Group } | null>(null)

  const grid = useMemo(
    () => heatmap(trades, DIMENSION_BY_KEY.jour, columns === 'session' ? DIMENSION_BY_KEY.session : hour),
    [trades, columns],
  )
  const value = (g: Group) => g[metric] ?? 0
  const maxAbs = Math.max(0, ...[...grid.cells.values()].map((g) => Math.abs(value(g))))
  const rowName = (r: string | null) => r ?? 'Sans date'
  const colName = (c: string | null) => c ?? (columns === 'heure' ? 'Sans heure' : 'Non renseigné')

  return (
    <motion.section className="panel" id="jour-session" variants={riseIn}>
      <div className="panel-header">
        <div>
          <h3>
            Jour × {columns === 'session' ? 'session' : 'heure'}
            <InfoTip text="Chaque case réunit les trades d'un jour de la semaine et d'une session (ou d'une heure de Bruxelles). Vert : la case rapporte des R, rouge : elle en coûte, d'autant plus vif que la valeur est grande. Clique sur une case pour voir ses trades." />
          </h3>
          <p className="panel-lede">Quels jours et quels moments de la journée rapportent le plus.</p>
          <p className="muted" aria-live="polite">
            {hovered ? (
              <>
                {hovered.row} · {hovered.col} : {hovered.group.count} trade{hovered.group.count > 1 ? 's' : ''},{' '}
                <span className={rClass(hovered.group.totalR)}>{formatR(hovered.group.totalR)}</span>
                {hovered.group.winRate !== null && `, ${formatPercent(hovered.group.winRate)} gagnants`}
                {!hovered.group.reliable && ' (peu fiable)'}
              </>
            ) : (
              'Survole une case pour son détail.'
            )}
          </p>
        </div>
        <div className="toolbar">
          <Segmented id="heatmap-columns" label="Colonnes" options={COLUMNS} value={columns} onChange={setColumns} />
          <Segmented id="heatmap-metric" label="Statistique" options={METRICS} value={metric} onChange={setMetric} />
        </div>
      </div>

      <div className="heatmap-scroll">
        <div className="heatmap" style={{ gridTemplateColumns: `auto repeat(${grid.cols.length}, minmax(64px, 1fr)) minmax(72px, auto)` }}>
          <span />
          {grid.cols.map((col) => (
            <span key={colName(col)} className="heatmap-head">
              {colName(col)}
            </span>
          ))}
          <span className="heatmap-head">Total</span>

          {grid.rows.map((row, r) => {
            const rowTrades = trades.filter((t) => DIMENSION_BY_KEY.jour.get(t) === row)
            const rowSummary = summarize(rowTrades)
            return [
              <span key={`h-${rowName(row)}`} className="heatmap-row-head">
                {rowName(row)}
              </span>,
              ...grid.cols.map((col, c) => {
                const g = grid.cells.get(cellKey(row, col))
                const key = `${columns}-${rowName(row)}-${colName(col)}`
                if (!g) return <span key={key} className="heatmap-cell empty" aria-hidden="true" />
                const v = value(g)
                return (
                  <motion.button
                    key={key}
                    type="button"
                    className={`heatmap-cell${g.reliable ? '' : ' low'}`}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: g.reliable ? 1 : 0.8, scale: 1, backgroundColor: heatColor(v, maxAbs) }}
                    whileHover={{ scale: 1.08, zIndex: 2, transition: { duration: 0.15 } }}
                    transition={{ delay: (r + c) * 0.025, type: 'spring', stiffness: 400, damping: 28 }}
                    onPointerEnter={() => setHovered({ row: rowName(row), col: colName(col), group: g })}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => setHovered({ row: rowName(row), col: colName(col), group: g })}
                    onBlur={() => setHovered(null)}
                    onClick={() => onOpen({ title: `${rowName(row)} · ${colName(col)}`, trades: g.trades })}
                    aria-label={`${rowName(row)}, ${colName(col)} : ${g.count} trades, ${formatR(g.totalR)}`}
                  >
                    <strong>{metric === 'avgR' && g.avgR !== null ? formatR(g.avgR, 1) : formatR(g.totalR, 1)}</strong>
                    <span>{g.count} tr.</span>
                  </motion.button>
                )
              }),
              <span key={`t-${rowName(row)}`} className={`heatmap-total ${rClass(rowSummary.totalR)}`}>
                {formatR(metric === 'avgR' && rowSummary.avgR !== null ? rowSummary.avgR : rowSummary.totalR, 1)}
              </span>,
            ]
          })}
        </div>
      </div>

      <div className="heat-legend" aria-hidden="true">
        <span>Coûte des R</span>
        <span className="heat-legend-bar" />
        <span>Rapporte des R</span>
        <span className="heat-legend-low">Case pâle et pointillée : moins de 5 trades</span>
      </div>
    </motion.section>
  )
}
