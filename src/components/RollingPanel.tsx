import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { rollingStats, type CurvePoint, type RollingPoint } from '../lib/stats'
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

const WINDOWS = [5, 10, 20].map((n) => ({ value: n, label: `${n} trades` }))

// « Forme récente » : la stat recalculée à chaque trade sur les N derniers trades seulement.
export function RollingPanel({
  curve,
  overall,
}: {
  curve: CurvePoint[]
  overall: { expectancy: number | null; winRate: number | null }
}) {
  const [metric, setMetric] = useState<Metric>('expectancy')
  const [size, setSize] = useState(10)
  const points = useMemo(() => rollingStats(curve, size), [curve, size])
  const c = themeColors()

  const format = metric === 'expectancy' ? (v: number) => formatR(v) : formatPercent
  const reference = overall[metric]
  const last = points.at(-1)?.[metric]

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
          <Segmented id="rolling-size" label="Nombre de trades" options={WINDOWS} value={size} onChange={setSize} />
        </div>
      </div>

      {points.length === 0 ? (
        <p className="muted">Il faut au moins {size} trades avec un RR closed pour cette vue.</p>
      ) : (
        <div className="chart" role="img" aria-label={`${metric === 'expectancy' ? 'Espérance' : 'Win rate'} glissant sur ${size} trades`}>
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
                domain={metric === 'winRate' ? [0, 1] : ['auto', 'auto']}
                tickFormatter={
                  metric === 'winRate'
                    ? formatPercent
                    : (v: number) => `${v.toLocaleString('fr-BE', { maximumFractionDigits: 1 })} R`
                }
              />
              {reference !== null && (
                <ReferenceLine
                  y={reference}
                  stroke={c.muted}
                  strokeDasharray="5 5"
                  label={{ value: 'Moyenne de la période', position: 'insideTopRight', fill: c.muted, fontSize: 11 }}
                />
              )}
              {metric === 'expectancy' && <ReferenceLine y={0} stroke={c.grid} />}
              <Tooltip
                content={<RollingTooltip metric={metric} size={size} />}
                cursor={{ stroke: c.muted, strokeDasharray: '3 3' }}
              />
              <Line
                type="monotone"
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
