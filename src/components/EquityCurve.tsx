import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CurvePoint } from '../lib/stats'
import { formatDate, formatR, rClass } from '../lib/trades'

// Couleurs lues dans index.css pour rester alignées sur le thème.
const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export function EquityCurve({ points }: { points: CurvePoint[] }) {
  if (!points.length) return <p className="muted">Aucun trade avec un RR closed.</p>

  const electric = css('--electric')
  const muted = css('--muted')
  const grid = css('--navy-light')
  const surface = css('--navy')
  const gain = css('--gain')
  const loss = css('--loss')
  // Point de départ à 0 R, avant le premier trade.
  const data = [{ index: 0, cumR: 0 }, ...points]

  return (
    <div className="chart" role="img" aria-label="Courbe des R cumulés, trade par trade">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="index"
            type="number"
            domain={[0, 'dataMax']}
            allowDecimals={false}
            stroke={muted}
            tick={{ fill: muted, fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            stroke={muted}
            tick={{ fill: muted, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => `${v} R`}
          />
          <ReferenceLine y={0} stroke={muted} />
          <Tooltip content={<CurveTooltip />} cursor={{ stroke: muted, strokeDasharray: '3 3' }} />
          <Line
            type="linear"
            dataKey="cumR"
            stroke={electric}
            strokeWidth={2}
            isAnimationActive={false}
            dot={(props: { cx?: number; cy?: number; index?: number; payload?: CurvePoint }) => {
              const { cx, cy, index, payload } = props
              if (cx === undefined || cy === undefined || !payload?.trade) return <g key={index} />
              const fill = payload.r > 0 ? gain : payload.r < 0 ? loss : muted
              return <circle key={index} cx={cx} cy={cy} r={4} fill={fill} stroke={surface} strokeWidth={2} />
            }}
            activeDot={{ r: 6, fill: electric, stroke: surface, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function CurveTooltip({ active, payload }: { active?: boolean; payload?: { payload: CurvePoint }[] }) {
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
    </div>
  )
}
