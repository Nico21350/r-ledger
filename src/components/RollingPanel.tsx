import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { niceTicks, rollingAvailable, rollingStats, type CurvePoint, type RollingPoint } from '../lib/stats'
import { formatPercent, formatR, rClass } from '../lib/trades'
import { themeColors } from '../lib/theme'
import { Segmented } from './Segmented'
import { InfoTip } from './InfoTip'
import { riseIn } from '../lib/motion'

type Metric = 'expectancy' | 'winRate'

const METRICS: { value: Metric; label: string }[] = [
  { value: 'expectancy', label: 'Espérance' },
  { value: 'winRate', label: 'Win rate' },
]

const WINDOWS = [5, 10, 20]

// « Forme récente » : la stat recalculée à chaque trade sur les N derniers trades seulement.
export function RollingPanel({
  curve,
  overall,
}: {
  curve: CurvePoint[]
  overall: { expectancy: number | null; winRate: number | null }
}) {
  const [metric, setMetric] = useState<Metric>('expectancy')
  const [chosen, setChosen] = useState(10)
  // Fenêtre grisée s'il n'y a pas assez de trades ; si celle choisie l'est (filtre), on prend la plus grande possible.
  const windows = WINDOWS.map((n) => ({
    value: n,
    label: `${n} trades`,
    disabled: rollingAvailable(curve.length, n) ? undefined : `Il faut au moins ${n * 2} trades pour cette fenêtre`,
  }))
  const size = rollingAvailable(curve.length, chosen)
    ? chosen
    : (windows.filter((w) => !w.disabled).at(-1)?.value ?? WINDOWS[0])
  const points = useMemo(() => rollingStats(curve, size), [curve, size])
  const c = themeColors()

  const format = metric === 'expectancy' ? (v: number) => formatR(v) : formatPercent
  const reference = overall[metric]
  const last = points.at(-1)?.[metric]

  // Graduations de l'axe de gauche (espérance) : rondes, et jamais deux fois le même libellé.
  const axis = useMemo(() => {
    const values = points.map((p) => p.expectancy)
    if (overall.expectancy !== null) values.push(overall.expectancy)
    return values.length ? niceTicks(Math.min(...values), Math.max(...values)) : null
  }, [points, overall.expectancy])

  return (
    <motion.div className="panel" variants={riseIn}>
      <div className="panel-header">
        <div>
          <h3>
            Forme récente
            <InfoTip text="La stat est recalculée à chaque trade, sur les N derniers trades seulement. La ligne pointillée montre la moyenne de toute la période : au-dessus, tu fais mieux que d'habitude." />
          </h3>
          {last !== undefined && reference !== null && (
            <p className="muted">
              Sur tes {size} derniers trades : {metric === 'expectancy' ? 'espérance' : 'win rate'}{' '}
              <strong className={metric === 'expectancy' ? rClass(last) : ''}>{format(last)}</strong>, contre{' '}
              {format(reference)} sur la période{' '}
              <span className={last > reference ? 'gain' : last < reference ? 'loss' : ''}>
                {last > reference ? '▲' : last < reference ? '▼' : '='}
              </span>
            </p>
          )}
        </div>
        <div className="toolbar">
          <Segmented id="rolling-metric" label="Statistique" options={METRICS} value={metric} onChange={setMetric} />
          <Segmented id="rolling-size" label="Nombre de trades" options={windows} value={size} onChange={setChosen} />
        </div>
      </div>

      {points.length === 0 ? (
        <p className="muted">Il faut au moins {size} trades avec un RR closed pour cette vue.</p>
      ) : (
        <div className="chart" role="img" aria-label={`${metric === 'expectancy' ? 'Espérance' : 'Win rate'} glissant sur ${size} trades`}>
          {reference !== null && (
            <div className="legend chart-legend rolling-legend">
              <span className="legend-swatch line" style={{ background: c.violet }} /> {size} derniers trades
              <span className="legend-swatch line dashed" style={{ color: c.muted }} /> Moyenne de la période
            </div>
          )}
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="index" stroke={c.muted} tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} />
              <YAxis
                stroke={c.muted}
                tick={{ fill: c.muted, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={52}
                domain={metric === 'winRate' || !axis ? [0, 1] : [axis.ticks[0], axis.ticks.at(-1)!]}
                ticks={metric === 'winRate' || !axis ? [0, 0.25, 0.5, 0.75, 1] : axis.ticks}
                tickFormatter={
                  metric === 'winRate' || !axis
                    ? formatPercent
                    : (v: number) =>
                        `${v.toLocaleString('fr-BE', { minimumFractionDigits: axis.decimals, maximumFractionDigits: axis.decimals })} R`
                }
              />
              {reference !== null && (
                <ReferenceLine y={reference} stroke={c.muted} strokeDasharray="5 5" />
              )}
              {metric === 'expectancy' && <ReferenceLine y={0} stroke={c.grid} />}
              <Tooltip
                content={<RollingTooltip metric={metric} size={size} />}
                cursor={{ stroke: c.muted, strokeDasharray: '3 3' }}
              />
              <Line
                type="linear"
                dataKey={metric}
                stroke={c.violet}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: c.violet, stroke: c.navy, strokeWidth: 2 }}
                animationDuration={700}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}

function RollingTooltip({
  active,
  payload,
  metric,
  size,
}: {
  active?: boolean
  payload?: { payload: RollingPoint }[]
  metric: Metric
  size: number
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="tooltip">
      <strong>
        Trades n°{Math.max(1, point.index - size + 1)} → n°{point.index}
      </strong>
      {metric === 'expectancy' ? (
        <span>
          Espérance : <span className={rClass(point.expectancy)}>{formatR(point.expectancy)}</span>
        </span>
      ) : (
        <span>Win rate : {formatPercent(point.winRate)}</span>
      )}
    </div>
  )
}
