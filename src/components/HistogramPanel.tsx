import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { histogram, median, summarize, type Bin } from '../lib/analysis'
import { riseIn } from '../lib/motion'
import { themeColors } from '../lib/theme'
import { formatR, rClass, type Trade } from '../lib/trades'
import { InfoTip } from './InfoTip'
import { Segmented } from './Segmented'
import type { DrawerContent } from './TradeDrawer'

const SIZES = [
  { value: 0.5, label: '0,5 R' },
  { value: 1, label: '1 R' },
]

// Répartition des R : combien de trades autour de −1 R, 0 R, +1 R, +2 R…
export function HistogramPanel({ trades, onOpen }: { trades: Trade[]; onOpen: (content: DrawerContent) => void }) {
  const [size, setSize] = useState(0.5)
  const bins = useMemo(() => histogram(trades, size), [trades, size])
  const c = themeColors()

  const rs = trades.map((t) => t.rr_closed).filter((r): r is number => r !== null)
  const summary = summarize(trades)
  const med = median(rs)
  const mode = bins.length ? bins.reduce((a, b) => (b.count > a.count ? b : a)) : null
  const total = rs.length
  // La position d'une ligne verticale doit tomber sur une colonne : on l'arrondit à la colonne la plus proche.
  const snap = (v: number) => Math.round(v / size) * size + 0 // + 0 : évite « −0 »
  const medianFirst = med !== null && summary.avgR !== null && med <= summary.avgR

  return (
    <motion.section className="panel panel-fill" id="repartition" variants={riseIn}>
      <div className="panel-header">
        <div>
          <h3>
            Répartition des R
            <InfoTip text="Chaque colonne compte les trades dont le résultat est proche de cette valeur. La médiane est le résultat du milieu : la moitié des trades fait mieux, l'autre moitié moins bien. Clique sur une colonne pour voir ses trades." />
          </h3>
          <p className="panel-lede">Combien de trades finissent à chaque niveau de gain ou de perte.</p>
          <p className="muted">
            Médiane{' '}
            <strong className={med === null ? '' : rClass(med)}>{med === null ? '—' : formatR(med)}</strong> · espérance{' '}
            <strong className={summary.avgR === null ? '' : rClass(summary.avgR)}>
              {summary.avgR === null ? '—' : formatR(summary.avgR)}
            </strong>
            {mode && (
              <>
                {' '}
                · le plus fréquent : <strong>{formatR(mode.center)}</strong> ({mode.count} trades)
              </>
            )}
          </p>
        </div>
        <Segmented id="histogram-size" label="Largeur des colonnes" options={SIZES} value={size} onChange={setSize} />
      </div>

      <div className="chart chart-fill" role="img" aria-label="Nombre de trades par résultat en R">
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <BarChart
            data={bins}
            margin={{ top: 24, right: 16, bottom: 0, left: 0 }}
            barCategoryGap={4}
            onClick={(state: { activeTooltipIndex?: number | string | null }) => {
              const bin = bins[Number(state.activeTooltipIndex)]
              if (bin?.count) onOpen({ title: `Résultats autour de ${formatR(bin.center)}`, trades: bin.trades })
            }}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="center"
              stroke={c.muted}
              tick={{ fill: c.muted, fontSize: 12 }}
              tickLine={false}
              tickFormatter={(v: number) => formatR(v, 1)}
            />
            <YAxis allowDecimals={false} stroke={c.muted} tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={false} width={36} />
            <Tooltip content={<BinTooltip total={total} />} cursor={{ fill: c.grid, fillOpacity: 0.35 }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={700}>
              {bins.map((b) => (
                <Cell key={b.center} fill={b.center > 0 ? c.gain : b.center < 0 ? c.loss : c.muted} fillOpacity={0.85} />
              ))}
            </Bar>
            {/* Étiquettes de part et d'autre : la ligne la plus à gauche a la sienne à gauche, l'autre à droite. */}
            {med !== null && (
              <ReferenceLine
                x={snap(med)}
                stroke={c.electric}
                strokeDasharray="5 4"
                label={{ value: 'Médiane', position: 'top', fill: c.electric, fontSize: 11, dx: medianFirst ? -28 : 28 }}
              />
            )}
            {summary.avgR !== null && snap(summary.avgR) !== (med === null ? null : snap(med)) && (
              <ReferenceLine
                x={snap(summary.avgR)}
                stroke={c.violet}
                strokeDasharray="5 4"
                label={{ value: 'Espérance', position: 'top', fill: c.violet, fontSize: 11, dx: medianFirst ? 30 : -30 }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  )
}

function BinTooltip({ active, payload, total }: { active?: boolean; payload?: { payload: Bin }[]; total: number }) {
  const bin = payload?.[0]?.payload
  if (!active || !bin) return null
  return (
    <div className="tooltip">
      <strong>Autour de {formatR(bin.center)}</strong>
      <span>
        {bin.count} trade{bin.count > 1 ? 's' : ''} · {total ? Math.round((bin.count / total) * 100) : 0} % du total
      </span>
      {bin.count > 0 && <span className="tooltip-hint">Clic → voir les trades</span>}
    </div>
  )
}
