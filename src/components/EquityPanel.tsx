import { useState, type Ref } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Overview } from '../lib/stats'
import { formatDate, formatR, rClass, type Trade } from '../lib/trades'
import { themeColors } from '../lib/theme'
import { Segmented } from './Segmented'
import { RangeSlider } from './RangeSlider'

// Un point du graphique : le point de départ (trade 0, à 0 R) n'a pas de trade.
type ChartPoint = { index: number; cumR: number; drawdown: number; r: number; trade?: Trade }

// Zoom : positions de début et de fin dans la liste des points (0 = départ).
export type Zoom = { start: number; end: number }
// Zone mise en avant après un clic sur une carte (plus forte baisse, série…).
export type Highlight = { x1: number; x2: number; label: string }

type View = 'curve' | 'bars'

const VIEWS: { value: View; label: string }[] = [
  { value: 'curve', label: 'Courbe' },
  { value: 'bars', label: 'R par trade' },
]

export function EquityPanel({
  stats,
  zoom,
  highlight,
  onZoomChange,
  onReset,
  panelRef,
}: {
  stats: Overview
  zoom: Zoom | null
  highlight: Highlight | null
  onZoomChange: (zoom: Zoom | null) => void
  onReset: () => void
  panelRef: Ref<HTMLDivElement>
}) {
  const [view, setView] = useState<View>('curve')
  const [showStreaks, setShowStreaks] = useState(true)
  const [sliding, setSliding] = useState(false)
  const navigate = useNavigate()
  const { search } = useLocation()
  const c = themeColors()

  const data: ChartPoint[] = [{ index: 0, cumR: 0, drawdown: 0, r: 0 }, ...stats.curve]
  const range = zoom ?? { start: 0, end: data.length - 1 }
  const visible = data.slice(range.start, range.end + 1)
  const visibleTrades = visible.filter((p) => p.trade)
  // Animation au premier affichage et au retour à la vue complète ; pendant un zoom, la courbe suit sans délai.
  const animate = zoom === null && !sliding

  // Le clic vise le trade de la bulle d'info : pas besoin de toucher le point exactement.
  const openTradeAt = (points: ChartPoint[]) => (state: { activeTooltipIndex?: number | string | null }) => {
    const trade = points[Number(state.activeTooltipIndex)]?.trade
    if (trade) navigate({ pathname: `/trade/${trade.id}`, search })
  }

  const axis = { stroke: c.muted, tick: { fill: c.muted, fontSize: 12 }, tickLine: false }
  const yAxis = {
    ...axis,
    axisLine: false,
    width: 52,
    tickFormatter: (v: number) => `${v.toLocaleString('fr-BE', { maximumFractionDigits: 1 })} R`,
  }
  // Étiquette du sommet à gauche du point quand il est au bord droit, pour ne pas être coupée.
  const peakNearEnd = stats.peak !== null && stats.peak.index > range.end - 3
  // Point le plus bas de la plus forte baisse ; pas d'étiquette s'il est collé au bord gauche (elle chevaucherait l'axe).
  const troughPoint = stats.drawdownRange ? stats.curve[stats.drawdownRange.to - 1] : null
  const trough = troughPoint && troughPoint.index > range.start ? troughPoint : null

  return (
    <div className="panel equity-panel" ref={panelRef}>
      <div className="panel-header">
        <div>
          <h3>R cumulés</h3>
          <p className="muted">Clique sur un point pour ouvrir la fiche du trade. Glisse les poignées de la barre du bas pour zoomer (double-clic : toute la période).</p>
        </div>
        <div className="toolbar">
          <Segmented id="equity-view" label="Affichage" options={VIEWS} value={view} onChange={setView} />
          <button
            type="button"
            role="switch"
            aria-checked={showStreaks}
            className={`switch${showStreaks ? ' on' : ''}`}
            onClick={() => setShowStreaks((s) => !s)}
          >
            <span className="switch-track">
              <motion.span className="switch-thumb" layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} />
            </span>
            Séries
          </button>
        </div>
      </div>

      <div className="chart-status">
        <AnimatePresence>
          {highlight && (
            <motion.span
              key={highlight.label}
              className="focus-chip"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {highlight.label}
            </motion.span>
          )}
          {zoom && (
            <motion.button
              key="reset"
              type="button"
              className="secondary small"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              onClick={onReset}
            >
              Voir toute la période
            </motion.button>
          )}
        </AnimatePresence>
        {showStreaks && stats.streaks.length > 0 && (
          <span className="legend">
            <span className="legend-swatch" style={{ background: c.gain }} /> Série gagnante (3+)
            <span className="legend-swatch" style={{ background: c.loss }} /> Série perdante (3+)
          </span>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="chart"
          role="img"
          aria-label={view === 'curve' ? 'Courbe des R cumulés, trade par trade' : 'R de chaque trade'}
        >
          <ResponsiveContainer width="100%" height={380}>
            {view === 'curve' ? (
              <ComposedChart
                data={visible}
                syncId="equity"
                syncMethod="value"
                margin={{ top: 28, right: 16, bottom: 0, left: 0 }}
                onClick={openTradeAt(visible)}
                style={{ cursor: 'pointer' }}
              >
                <defs>
                  <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.violet} stopOpacity={0.35} />
                    <stop offset="60%" stopColor={c.electric} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={c.electric} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="equity-stroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={c.electric} />
                    <stop offset="100%" stopColor={c.violet} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="index" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} {...axis} />
                <YAxis {...yAxis} />
                {showStreaks &&
                  stats.streaks.map((s) => (
                    <ReferenceArea
                      key={`${s.type}-${s.from}`}
                      x1={s.from - 1}
                      x2={s.to}
                      fill={s.type === 'win' ? c.gain : c.loss}
                      fillOpacity={0.1}
                      ifOverflow="hidden"
                    />
                  ))}
                {highlight && (
                  <ReferenceArea
                    x1={highlight.x1}
                    x2={highlight.x2}
                    stroke={c.violet}
                    strokeDasharray="4 4"
                    fill={c.violet}
                    fillOpacity={0.1}
                    ifOverflow="hidden"
                  />
                )}
                <ReferenceLine y={0} stroke={c.muted} />
                <Tooltip content={<PointTooltip />} cursor={{ stroke: c.muted, strokeDasharray: '3 3' }} />
                <Area
                  type="linear"
                  dataKey="cumR"
                  stroke="url(#equity-stroke)"
                  strokeWidth={2.5}
                  fill="url(#equity-fill)"
                  isAnimationActive={animate}
                  animationDuration={900}
                  dot={(props: { cx?: number; cy?: number; index?: number; payload?: ChartPoint }) => {
                    const { cx, cy, index, payload } = props
                    if (cx === undefined || cy === undefined || !payload?.trade) return <g key={index} />
                    const fill = payload.r > 0 ? c.gain : payload.r < 0 ? c.loss : c.muted
                    return <circle key={index} cx={cx} cy={cy} r={4} fill={fill} stroke={c.navy} strokeWidth={2} />
                  }}
                  activeDot={{ r: 7, fill: c.violet, stroke: c.navy, strokeWidth: 2 }}
                />
                {stats.peak && stats.peak.cumR > 0 && (
                  <ReferenceDot
                    x={stats.peak.index}
                    y={stats.peak.cumR}
                    r={0}
                    ifOverflow="discard"
                    label={{
                      value: `Sommet ${formatR(stats.peak.cumR)}`,
                      position: peakNearEnd ? 'left' : 'top',
                      offset: 10,
                      fill: c.text,
                      fontSize: 12,
                    }}
                  />
                )}
                {trough && (
                  <ReferenceDot
                    x={trough.index}
                    y={trough.cumR}
                    r={0}
                    ifOverflow="discard"
                    label={{
                      value: `Plus forte baisse ${formatR(stats.maxDrawdown)}`,
                      position: 'bottom',
                      fill: c.muted,
                      fontSize: 12,
                    }}
                  />
                )}
              </ComposedChart>
            ) : (
              <BarChart
                data={visibleTrades}
                syncId="equity"
                syncMethod="value"
                margin={{ top: 28, right: 16, bottom: 0, left: 0 }}
                onClick={openTradeAt(visibleTrades)}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="index" {...axis} />
                <YAxis {...yAxis} />
                <ReferenceLine y={0} stroke={c.muted} />
                <Tooltip content={<PointTooltip />} cursor={{ fill: c.grid, fillOpacity: 0.4 }} />
                <Bar dataKey="r" radius={4} isAnimationActive={animate} animationDuration={700}>
                  {visibleTrades.map((p) => (
                    <Cell key={p.index} fill={p.r > 0 ? c.gain : p.r < 0 ? c.loss : c.muted} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </motion.div>
      </AnimatePresence>

      <div className="chart drawdown-chart" role="img" aria-label="Écart avec le plus haut sommet, trade par trade">
        <span className="chart-label muted">Sous le sommet (drawdown)</span>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={visible} syncId="equity" syncMethod="value" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="drawdown-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.loss} stopOpacity={0.05} />
                <stop offset="100%" stopColor={c.loss} stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="index" type="number" domain={['dataMin', 'dataMax']} hide />
            <YAxis {...yAxis} domain={['dataMin', 0]} />
            <Tooltip content={<DrawdownTooltip />} cursor={{ stroke: c.muted, strokeDasharray: '3 3' }} />
            <Area
              type="linear"
              dataKey="drawdown"
              stroke={c.loss}
              strokeWidth={1.5}
              fill="url(#drawdown-fill)"
              isAnimationActive={animate}
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <RangeSlider
        values={data.map((p) => p.cumR)}
        start={range.start}
        end={range.end}
        onChange={(start, end) => onZoomChange(start === 0 && end === data.length - 1 ? null : { start, end })}
        onReset={onReset}
        onDragChange={setSliding}
        formatLabel={(v) => (v === 0 ? 'Départ' : `n°${v}`)}
      />
    </div>
  )
}

function PointTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  const point = payload?.[0]?.payload
  if (!active || !point?.trade) return null
  const { trade } = point
  return (
    <div className="tooltip">
      <strong>
        Trade n°{point.index} · {trade.instrument ?? '—'} {trade.direction ?? ''}
      </strong>
      <span className="muted">{formatDate(trade)}</span>
      <span>
        Résultat : <span className={rClass(point.r)}>{formatR(point.r)}</span>
        {!trade.taken && <span className="muted"> (non pris)</span>}
      </span>
      <span>
        Cumul : <span className={rClass(point.cumR)}>{formatR(point.cumR)}</span>
      </span>
      <span className="tooltip-hint">Clic → fiche du trade</span>
    </div>
  )
}

function DrawdownTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="tooltip">
      <span>
        {point.drawdown === 0 ? (
          'Au plus haut'
        ) : (
          <>
            Sous le sommet : <span className="loss">{formatR(point.drawdown)}</span>
          </>
        )}
      </span>
    </div>
  )
}
