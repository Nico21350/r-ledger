import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import type { CurvePoint, Overview as OverviewStats } from '../lib/stats'
import { formatPercent, formatR, rClass, type Trade } from '../lib/trades'
import { themeColors } from '../lib/theme'
import { useIndicatorChoice } from '../hooks/useIndicatorChoice'
import { AnimatedNumber } from './AnimatedNumber'
import { EquityPanel, type Highlight, type Zoom } from './EquityPanel'
import { curveFocus, type IndicatorId } from '../lib/indicators'
import { IndicatorTile } from './IndicatorTile'
import { IndicatorPicker } from './IndicatorPicker'
import { InfoTip } from './InfoTip'
import { InsightsPanel } from './InsightsPanel'
import { RecentTrades } from './RecentTrades'
import { Delta } from './StatTile'
import { riseIn, stagger } from '../lib/motion'

const rGap = (v: number) => `${v.toLocaleString('fr-BE', { maximumFractionDigits: 2 })} R`

type Focus = { key: string; zoom: Zoom | null; highlight: Highlight | null }

// Arrivée depuis Analyses avec « Voir sur la courbe » : l'indicateur est passé dans l'état de la navigation.
export type OverviewState = { focus?: IndicatorId } | null

export function Overview({ stats, previous, trades }: { stats: OverviewStats; previous: OverviewStats | null; trades: Trade[] }) {
  const navigate = useNavigate()
  const { search, state } = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)
  const [indicators, setIndicators] = useIndicatorChoice()

  // Le zoom ne vaut que pour les filtres et les trades avec lesquels il a été fait :
  // changer un filtre (ou synchroniser de nouveaux trades) le remet à zéro.
  const dataKey = `${search}|${stats.count}-${stats.curve[0]?.trade.id}-${stats.curve.at(-1)?.trade.id}`
  const focusFor = (id: IndicatorId): Focus | null => {
    const target = curveFocus(stats, id)
    if (!target) return null
    const last = stats.curve.length
    // Zoom sur le passage concerné, avec 2 trades de marge.
    return { key: dataKey, zoom: { start: Math.max(0, target.x1 - 2), end: Math.min(last, target.x2 + 2) }, highlight: target }
  }
  const arrival = (state as OverviewState)?.focus
  const [focusState, setFocusState] = useState<Focus>(() => (arrival && focusFor(arrival)) || { key: '', zoom: null, highlight: null })
  const focus = focusState.key === dataKey ? focusState : { ...focusState, zoom: null, highlight: null }

  // Arrivée avec un passage à montrer : on descend jusqu'à la courbe une fois la page affichée.
  useEffect(() => {
    if (!arrival) return
    const timer = setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350)
    return () => clearTimeout(timer)
  }, [arrival])

  // Clic sur une carte : zoom sur le passage concerné et défilement jusqu'à la courbe.
  function showOnCurve(id: IndicatorId) {
    const next = focusFor(id)
    if (!next) return
    setFocusState(next)
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const openTrade = (p: CurvePoint) => navigate({ pathname: `/trade/${p.trade.id}`, search })

  return (
    <motion.div className="overview" initial="hidden" animate="show" variants={stagger}>
      <Hero stats={stats} previous={previous} />
      <InsightsPanel trades={trades} compact />

      {/* Courbe en vedette à gauche, indicateurs choisis à droite. */}
      <div className="overview-main">
        <motion.div className="overview-chart" variants={riseIn}>
          <EquityPanel
            stats={stats}
            zoom={focus.zoom}
            highlight={focus.highlight}
            onZoomChange={(zoom) => setFocusState({ ...focus, key: dataKey, zoom })}
            onReset={() => setFocusState({ key: dataKey, zoom: null, highlight: null })}
            panelRef={panelRef}
          />
        </motion.div>

        <motion.aside className="overview-side tile-section" variants={stagger}>
          <motion.div className="section-head" variants={riseIn}>
            <h3 className="section-title">Indicateurs</h3>
            <IndicatorPicker value={indicators} onChange={setIndicators} />
          </motion.div>
          <motion.div className="tiles" variants={stagger}>
            {indicators.map((id) => (
              <IndicatorTile key={id} id={id} stats={stats} previous={previous} onCurve={showOnCurve} onTrade={openTrade} />
            ))}
          </motion.div>
        </motion.aside>
      </div>

      <RecentTrades trades={trades} />
    </motion.div>
  )
}

// Grande carte du haut : total de la période, mini-courbe et série en cours.
function Hero({ stats, previous }: { stats: OverviewStats; previous: OverviewStats | null }) {
  const c = themeColors()
  const streak = stats.currentStreak
  return (
    <motion.div className="hero" variants={riseIn}>
      <div className="hero-main">
        <span className="tile-label">
          Total de la période
          <InfoTip text="La somme des R de tous les trades sélectionnés par les filtres." />
        </span>
        <strong className={`hero-value ${rClass(stats.totalR)}`}>
          <AnimatedNumber value={stats.totalR} format={formatR} />
        </strong>
        <Delta value={stats.totalR} previous={previous?.totalR} higherIsBetter format={rGap} />
        <p className="muted">
          {stats.count} trades · {stats.winRate === null ? '—' : formatPercent(stats.winRate)} gagnants · espérance{' '}
          {stats.avgR === null ? '—' : formatR(stats.avgR)}
        </p>
        <p className="muted r-explainer">1 R = le montant risqué sur un trade ; +2 R = un gain de deux fois ce montant.</p>
        {streak && streak.length >= 2 && (
          <motion.span
            className={`streak-badge ${streak.type === 'win' ? 'gain' : 'loss'}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
          >
            {streak.type === 'win' ? '🔥' : '⚠'} Série en cours : {streak.length}{' '}
            {streak.type === 'win' ? 'gains' : 'pertes'} d'affilée
          </motion.span>
        )}
      </div>
      <div className="hero-spark" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[{ cumR: 0 }, ...stats.curve]} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.violet} stopOpacity={0.45} />
                <stop offset="100%" stopColor={c.electric} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="hero-stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={c.electric} />
                <stop offset="100%" stopColor={c.violet} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="cumR"
              stroke="url(#hero-stroke)"
              strokeWidth={2.5}
              fill="url(#hero-fill)"
              dot={false}
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
