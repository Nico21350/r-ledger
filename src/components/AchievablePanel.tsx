import { useMemo } from 'react'
import { motion } from 'motion/react'
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { compareAchievable, type RrPoint } from '../lib/analysis'
import { riseIn, stagger } from '../lib/motion'
import { themeColors } from '../lib/theme'
import { formatPercent, formatR, rClass, type Trade } from '../lib/trades'
import { InfoTip } from './InfoTip'
import { StatTile } from './StatTile'
import type { DrawerContent } from './TradeDrawer'

// Une bulle = tous les trades qui ont le même couple (atteignable, encaissé) ; plus il y en a, plus elle est grosse.
type Bubble = { achievable: number; closed: number; left: number; count: number; points: RrPoint[] }

const axisR = (v: number) => `${v.toLocaleString('fr-BE', { maximumFractionDigits: 1 })} R`

// Ce que le marché offrait (Achievable RR) comparé à ce que tu as encaissé (RR closed).
export function AchievablePanel({ trades, onOpen }: { trades: Trade[]; onOpen: (content: DrawerContent) => void }) {
  const c = themeColors()
  const comparison = useMemo(() => compareAchievable(trades), [trades])
  const { points, totalLeft, captureRate, unreadable } = comparison

  const bubbles = useMemo(() => {
    const map = new Map<string, Bubble>()
    for (const p of points) {
      const key = `${p.achievable}|${p.closed}`
      const b = map.get(key) ?? { achievable: p.achievable, closed: p.closed, left: p.left, count: 0, points: [] }
      b.count++
      b.points.push(p)
      map.set(key, b)
    }
    return [...map.values()]
  }, [points])

  const max = Math.ceil(Math.max(1, ...points.map((p) => Math.max(p.achievable, p.closed))))
  const min = Math.floor(Math.min(0, ...points.map((p) => p.closed)))
  const biggest = [...points].filter((p) => p.left > 0).sort((a, b) => b.left - a.left).slice(0, 3)
  const full = bubbles.filter((b) => b.left === 0)
  const partial = bubbles.filter((b) => b.left > 0)

  const open = (b: Bubble) =>
    onOpen({ title: `Atteignable ${formatR(b.achievable)} · encaissé ${formatR(b.closed)}`, trades: b.points.map((p) => p.trade) })

  return (
    <motion.section className="panel" id="rr-atteignable" variants={riseIn}>
      <div className="panel-header">
        <div>
          <h3>
            RR closed contre Achievable RR
            <InfoTip text="Chaque bulle compare ce que le marché offrait (Achievable RR, en bas) à ce que tu as encaissé (RR closed, à gauche). Sur la diagonale : tu as tout pris. En dessous : tu as laissé des R sur la table. Clique sur une bulle pour voir ses trades." />
          </h3>
          <p className="muted">
            {points.length} trades comparables (avec un Achievable RR)
            {unreadable > 0 && ` · ${unreadable} texte${unreadable > 1 ? 's' : ''} illisible${unreadable > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <motion.div className="mini-tiles" variants={stagger}>
        <StatTile
          label="R laissés sur la table"
          value={-totalLeft}
          format={(v) => formatR(v)}
          tone={rClass}
          info="Total de ce que tu aurais pu encaisser en plus, en sortant au meilleur niveau atteignable."
        />
        <StatTile
          label="Taux de capture"
          value={captureRate}
          format={formatPercent}
          info="R encaissés ÷ R atteignables, sur les trades où un gain était possible. 100 % : tu as tout pris."
        />
      </motion.div>

      {points.length === 0 ? (
        <p className="muted">Aucun trade avec un Achievable RR sur la sélection.</p>
      ) : (
        <div className="chart" role="img" aria-label="Achievable RR comparé au RR closed, trade par trade">
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 12, right: 20, bottom: 12, left: 0 }}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="achievable"
                name="Atteignable"
                domain={[0, max]}
                allowDecimals={false}
                stroke={c.muted}
                tick={{ fill: c.muted, fontSize: 12 }}
                tickFormatter={axisR}
                label={{ value: 'Atteignable', position: 'insideBottomRight', offset: -6, fill: c.muted, fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="closed"
                name="Encaissé"
                domain={[min, max]}
                allowDecimals={false}
                stroke={c.muted}
                tick={{ fill: c.muted, fontSize: 12 }}
                tickFormatter={axisR}
                width={52}
              />
              <ZAxis type="number" dataKey="count" range={[90, 600]} />
              <ReferenceLine
                segment={[
                  { x: 0, y: 0 },
                  { x: max, y: max },
                ]}
                stroke={c.violet}
                strokeDasharray="6 4"
                label={{ value: 'Tout encaissé', position: 'insideTopLeft', fill: c.violet, fontSize: 11 }}
              />
              <ReferenceLine y={0} stroke={c.muted} />
              <Tooltip content={<BubbleTooltip />} cursor={{ strokeDasharray: '3 3', stroke: c.muted }} />
              <Scatter
                name="Tout encaissé"
                data={full}
                fill={c.gain}
                fillOpacity={0.75}
                stroke={c.navy}
                strokeWidth={2}
                onClick={(b: unknown) => open(b as Bubble)}
                style={{ cursor: 'pointer' }}
                animationDuration={700}
              />
              <Scatter
                name="R laissés"
                data={partial}
                fill={c.violet}
                fillOpacity={0.8}
                stroke={c.navy}
                strokeWidth={2}
                onClick={(b: unknown) => open(b as Bubble)}
                style={{ cursor: 'pointer' }}
                animationDuration={700}
              />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="legend chart-legend">
            <span className="legend-swatch round" style={{ background: c.gain }} /> Tout encaissé (ou rien à prendre)
            <span className="legend-swatch round" style={{ background: c.violet }} /> R laissés sur la table
          </div>
        </div>
      )}

      {biggest.length > 0 && (
        <div className="gap-list">
          <span className="section-title">Plus gros écarts</span>
          {biggest.map((p) => (
            <button
              key={p.trade.id}
              type="button"
              className="gap-row"
              onClick={() => onOpen({ title: `${p.trade.instrument ?? 'Trade'} : ${formatR(p.left)} laissés`, trades: [p.trade] })}
            >
              <span>
                {p.trade.instrument ?? '—'} {p.trade.direction ?? ''} · {p.trade.achievable_rr_text}
              </span>
              <span className="muted">
                encaissé {formatR(p.closed)} sur {formatR(p.achievable)}
              </span>
              <strong className="loss">−{formatR(p.left).replace('+', '')}</strong>
            </button>
          ))}
        </div>
      )}
    </motion.section>
  )
}

function BubbleTooltip({ active, payload }: { active?: boolean; payload?: { payload: Bubble }[] }) {
  const b = payload?.[0]?.payload
  if (!active || !b) return null
  return (
    <div className="tooltip">
      <strong>
        {b.count} trade{b.count > 1 ? 's' : ''}
      </strong>
      <span>
        Atteignable {formatR(b.achievable)} · encaissé {formatR(b.closed)}
      </span>
      <span className={b.left > 0 ? 'loss' : 'gain'}>
        {b.left > 0 ? `${formatR(b.left).replace('+', '')} laissés par trade` : 'Rien laissé sur la table'}
      </span>
      <span className="tooltip-hint">Clic → voir les trades</span>
    </div>
  )
}
