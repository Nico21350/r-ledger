import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { riseIn, stagger } from '../lib/motion'
import { quantile, simulate, streakProbability, type Mode } from '../lib/montecarlo'
import { themeColors } from '../lib/theme'
import { formatPercent, formatR, rClass, type Trade } from '../lib/trades'
import { InfoTip } from './InfoTip'
import { Segmented } from './Segmented'
import { StatTile } from './StatTile'

const RUNS = 1000

const MODES: { value: Mode; label: string }[] = [
  { value: 'melange', label: "Mélanger l'ordre" },
  { value: 'tirage', label: 'Tirer au sort' },
]

const axisR = (v: number) => `${v.toLocaleString('fr-BE', { maximumFractionDigits: 0 })} R`

// 1 000 versions possibles de ton parcours : même trades dans un autre ordre, ou trades tirés au sort parmi les tiens.
export function MonteCarloPanel({ trades }: { trades: Trade[] }) {
  const c = themeColors()
  const rs = useMemo(() => trades.map((t) => t.rr_closed).filter((r): r is number => r !== null), [trades])
  const [mode, setMode] = useState<Mode>('melange')
  const [horizon, setHorizon] = useState(100)
  const [seed, setSeed] = useState(1)
  const [streak, setStreak] = useState(3)

  const steps = mode === 'melange' ? rs.length : horizon
  const sim = useMemo(() => simulate(rs, { runs: RUNS, mode, steps, seed }), [rs, mode, steps, seed])

  const drawdowns = [...sim.maxDrawdowns].sort((a, b) => a - b)
  const finals = [...sim.finals].sort((a, b) => a - b)
  const typicalDd = quantile(drawdowns, 0.5)
  const badDd = quantile(drawdowns, 0.05) // 95 % des simulations font mieux que ça
  const negative = sim.finals.filter((f) => f < 0).length / RUNS
  const probability = streakProbability(sim, streak)
  const maxStreak = Math.max(10, ...sim.lossStreaks)

  // Ton vrai parcours, superposé (seulement sur la longueur de tes trades).
  const actual = rs.reduce<number[]>((acc, r) => [...acc, (acc.at(-1) ?? 0) + r], [0])
  const chartData = sim.bands.map((b) => ({
    ...b,
    outer: [b.p5, b.p95],
    inner: [b.p25, b.p75],
    actual: b.index < actual.length ? actual[b.index] : undefined,
  }))
  const streakBars = Array.from({ length: Math.min(maxStreak, 12) }, (_, i) => ({
    length: i + 1,
    probability: streakProbability(sim, i + 1),
  }))

  const horizons = [
    { value: rs.length, label: `${rs.length} trades` },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 200, label: '200' },
  ].filter((h, i, list) => list.findIndex((x) => x.value === h.value) === i)

  if (rs.length < 2) {
    return (
      <motion.section className="panel" id="monte-carlo" variants={riseIn}>
        <h3>Simulation de Monte-Carlo</h3>
        <p className="muted">Il faut au moins 2 trades avec un RR closed.</p>
      </motion.section>
    )
  }

  return (
    <motion.section className="panel" id="monte-carlo" variants={riseIn}>
      <div className="panel-header">
        <div>
          <h3>
            Simulation de Monte-Carlo
            <InfoTip text="L'ordre de tes trades doit beaucoup au hasard. On rejoue tes R 1 000 fois : « Mélanger l'ordre » garde exactement tes trades et change seulement l'ordre (même total, baisses différentes) ; « Tirer au sort » pioche au hasard parmi tes résultats pour imaginer les prochains trades." />
          </h3>
          <p className="muted">
            {mode === 'melange'
              ? `Tes ${rs.length} trades rejoués dans ${RUNS.toLocaleString('fr-BE')} ordres différents.`
              : `${RUNS.toLocaleString('fr-BE')} séries de ${horizon} trades tirés au sort parmi les tiens.`}
          </p>
        </div>
        <div className="toolbar">
          <Segmented id="mc-mode" label="Méthode" options={MODES} value={mode} onChange={setMode} />
          {mode === 'tirage' && <Segmented id="mc-horizon" label="Nombre de trades" options={horizons} value={horizon} onChange={setHorizon} />}
          <motion.button type="button" className="secondary small" whileTap={{ rotate: -20 }} onClick={() => setSeed((s) => s + 1)}>
            ↻ Relancer
          </motion.button>
        </div>
      </div>

      <motion.div className="mini-tiles mc-tiles" variants={stagger}>
        <StatTile
          label="Baisse typique"
          value={typicalDd}
          format={(v) => formatR(v, 1)}
          tone={rClass}
          info="La plus forte baisse (drawdown) d'une simulation sur deux. Ta vraie plus forte baisse peut être meilleure ou pire selon l'ordre."
        />
        <StatTile
          label="Baisse à prévoir (95 %)"
          value={badDd}
          format={(v) => formatR(v, 1)}
          tone={rClass}
          info="Dans 95 % des simulations, la plus forte baisse ne va pas plus bas que ça. C'est la baisse à être prêt à encaisser."
        />
        <StatTile
          label={mode === 'melange' ? 'Total (identique)' : 'Total médian'}
          value={quantile(finals, 0.5)}
          format={(v) => formatR(v, 1)}
          tone={rClass}
          detail={mode === 'tirage' ? `5 % des cas sous ${formatR(quantile(finals, 0.05), 1)}` : 'Mêmes trades : même total'}
          info="R cumulés à la fin, dans la simulation du milieu."
        />
        {mode === 'tirage' && (
          <StatTile
            label="Risque de finir négatif"
            value={negative}
            format={formatPercent}
            tone={(v) => (v > 0.2 ? 'loss' : v > 0.05 ? '' : 'gain')}
            info="Part des simulations qui finissent sous 0 R."
          />
        )}
      </motion.div>

      <div className="mc-body">
        <motion.div
          key={`${mode}-${steps}-${seed}`}
          className="chart"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          role="img"
          aria-label="Éventail des R cumulés simulés, avec ton vrai parcours"
        >
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="mc-outer" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.violet} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={c.electric} stopOpacity={0.12} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="index" stroke={c.muted} tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} />
              <YAxis stroke={c.muted} tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={false} width={52} tickFormatter={axisR} />
              <Tooltip content={<FanTooltip />} cursor={{ stroke: c.muted, strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="outer" stroke="none" fill="url(#mc-outer)" animationDuration={800} />
              <Area type="monotone" dataKey="inner" stroke="none" fill={c.violet} fillOpacity={0.28} animationDuration={800} />
              <Line type="monotone" dataKey="p50" stroke={c.electric} strokeWidth={2} dot={false} animationDuration={800} />
              <Line type="linear" dataKey="actual" stroke={c.text} strokeWidth={2} strokeDasharray="4 3" dot={false} connectNulls={false} animationDuration={800} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="legend chart-legend">
            <span className="legend-swatch" style={{ background: c.violet, opacity: 0.25 }} /> 90 % des simulations
            <span className="legend-swatch" style={{ background: c.violet, opacity: 0.6 }} /> 50 % des simulations
            <span className="legend-swatch" style={{ background: c.electric, opacity: 1 }} /> Simulation médiane
            <span className="legend-swatch" style={{ background: c.text, opacity: 1 }} /> Ton vrai parcours
          </div>
        </motion.div>

        <div className="mc-streak">
          <span className="section-title">Séries de pertes</span>
          <p className="mc-streak-answer">
            Enchaîner <strong>{streak} pertes</strong> d'affilée (ou plus) arrive dans{' '}
            <strong className={probability > 0.5 ? 'loss' : ''}>{formatPercent(probability)}</strong> des simulations
            {mode === 'tirage' ? ` sur ${horizon} trades` : ''}.
          </p>
          <input
            type="range"
            className="range-input"
            min={2}
            max={Math.min(maxStreak, 12)}
            value={streak}
            onChange={(e) => setStreak(Number(e.target.value))}
            aria-label="Nombre de pertes d'affilée"
          />
          <div className="chart" role="img" aria-label="Probabilité de chaque longueur de série de pertes">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={streakBars} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                <XAxis dataKey="length" stroke={c.muted} tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} />
                <YAxis hide domain={[0, 1]} />
                <Tooltip
                  cursor={{ fill: c.grid, fillOpacity: 0.35 }}
                  content={({ active, payload }) => {
                    const p = payload?.[0]?.payload as { length: number; probability: number } | undefined
                    if (!active || !p) return null
                    return (
                      <div className="tooltip">
                        <strong>{p.length} pertes d'affilée ou plus</strong>
                        <span>{formatPercent(p.probability)} des simulations</span>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="probability"
                  radius={[4, 4, 0, 0]}
                  onClick={(d: unknown) => {
                    const length = (d as { length?: number }).length
                    if (length && length >= 2) setStreak(length)
                  }}
                  style={{ cursor: 'pointer' }}
                  animationDuration={600}
                >
                  {streakBars.map((b) => (
                    <Cell key={b.length} fill={b.length === streak ? c.violet : c.loss} fillOpacity={b.length === streak ? 1 : 0.45} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function FanTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: { index: number; p5: number; p50: number; p95: number; actual?: number } }[]
}) {
  const p = payload?.[0]?.payload
  if (!active || !p) return null
  return (
    <div className="tooltip">
      <strong>Après {p.index} trades</strong>
      <span>
        Médiane : <span className={rClass(p.p50)}>{formatR(p.p50, 1)}</span>
      </span>
      <span className="muted">
        9 simulations sur 10 entre {formatR(p.p5, 1)} et {formatR(p.p95, 1)}
      </span>
      {p.actual !== undefined && (
        <span>
          Ton parcours : <span className={rClass(p.actual)}>{formatR(p.actual, 1)}</span>
        </span>
      )}
    </div>
  )
}
