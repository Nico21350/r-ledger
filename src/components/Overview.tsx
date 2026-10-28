import { useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import type { CurvePoint, Overview as OverviewStats, Streak } from '../lib/stats'
import { formatDate, formatNumber, formatPercent, formatR, rClass } from '../lib/trades'
import { themeColors } from '../lib/theme'
import { AnimatedNumber } from './AnimatedNumber'
import { EquityPanel, type Highlight, type Zoom } from './EquityPanel'
import { InfoTip } from './InfoTip'
import { RollingPanel } from './RollingPanel'
import { Delta, StatTile } from './StatTile'
import { riseIn, stagger } from '../lib/motion'


// Écart entre deux valeurs, sans signe (la flèche ▲▼ le donne déjà).
const rGap = (v: number) => `${v.toLocaleString('fr-BE', { maximumFractionDigits: 2 })} R`
const pointsGap = (v: number) => `${Math.round(v * 100)} pts`
const count = (v: number) => String(Math.round(v))
const tradesCount = (v: number) => `${Math.round(v)} trade${Math.round(v) > 1 ? 's' : ''}`

function sqnLabel(sqn: number | null): string | undefined {
  if (sqn === null) return undefined
  if (sqn < 1.6) return 'Faible'
  if (sqn < 2) return 'Moyen'
  if (sqn < 3) return 'Bon'
  return 'Excellent'
}

type Focus = { key: string; zoom: Zoom | null; highlight: Highlight | null; version: number }

export function Overview({ stats, previous }: { stats: OverviewStats; previous: OverviewStats | null }) {
  const navigate = useNavigate()
  const { search } = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)

  // Le zoom ne vaut que pour les filtres et les trades avec lesquels il a été fait :
  // changer un filtre (ou synchroniser de nouveaux trades) le remet à zéro.
  const dataKey = `${search}|${stats.count}-${stats.curve[0]?.trade.id}-${stats.curve.at(-1)?.trade.id}`
  const [focusState, setFocusState] = useState<Focus>({ key: '', zoom: null, highlight: null, version: 0 })
  const focus = focusState.key === dataKey ? focusState : { ...focusState, zoom: null, highlight: null }

  // Clic sur une carte : zoom sur le passage concerné (avec 2 trades de marge) et défilement jusqu'à la courbe.
  function focusOn(x1: number, x2: number, label: string) {
    const last = stats.curve.length
    setFocusState((f) => ({
      key: dataKey,
      zoom: { start: Math.max(0, x1 - 2), end: Math.min(last, x2 + 2) },
      highlight: { x1, x2, label },
      version: f.version + 1,
    }))
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const focusStreak = (s: Streak, label: string) => focusOn(s.from - 1, s.to, `${label} : trades n°${s.from} → n°${s.to}`)
  const openTrade = (p: CurvePoint) => navigate({ pathname: `/trade/${p.trade.id}`, search })

  // Valeur de la période précédente ; undefined = pas de comparaison (aucune période choisie).
  const prev = <T,>(pick: (o: OverviewStats) => T) => (previous ? pick(previous) : undefined)

  return (
    <motion.div className="overview" initial="hidden" animate="show" variants={stagger}>
      <Hero stats={stats} previous={previous} />

      <Section title="Performance">
        <StatTile
          label="Espérance"
          value={stats.avgR}
          format={formatR}
          tone={rClass}
          previous={prev((o) => o.avgR)}
          formatDelta={rGap}
          info="Ce que rapporte un trade en moyenne, en R. Positive : ta stratégie gagne sur la durée."
        />
        <StatTile
          label="Win rate"
          value={stats.winRate}
          format={formatPercent}
          previous={prev((o) => o.winRate)}
          formatDelta={pointsGap}
          info="Part des trades gagnants (R positif). Un BE ne compte ni comme gain ni comme perte."
        />
        <StatTile
          label="Profit factor"
          value={stats.profitFactor}
          format={(v) => formatNumber(v)}
          tone={(v) => (v >= 1 ? 'gain' : 'loss')}
          previous={prev((o) => o.profitFactor)}
          formatDelta={(v) => formatNumber(v)}
          info="Total des R gagnés ÷ total des R perdus. Au-dessus de 1, tu gagnes plus que tu ne perds."
        />
        <StatTile
          label="Gain moyen"
          value={stats.avgWin}
          format={formatR}
          tone={rClass}
          previous={prev((o) => o.avgWin)}
          formatDelta={rGap}
          info="R moyen des trades gagnants."
        />
        <StatTile
          label="Perte moyenne"
          value={stats.avgLoss}
          format={formatR}
          tone={rClass}
          previous={prev((o) => o.avgLoss)}
          formatDelta={rGap}
          info="R moyen des trades perdants. Plus elle est proche de 0, mieux tu coupes tes pertes."
        />
      </Section>

      <Section title="Risque">
        <StatTile
          label="Plus forte baisse"
          value={stats.maxDrawdown}
          format={formatR}
          tone={rClass}
          previous={prev((o) => o.maxDrawdown)}
          formatDelta={rGap}
          info="La plus grosse chute des R cumulés depuis un sommet (drawdown)."
          detail={
            stats.drawdownRange
              ? `${stats.drawdownRange.from === 0 ? 'Départ' : `Trade n°${stats.drawdownRange.from}`} → n°${stats.drawdownRange.to}`
              : 'Aucune baisse'
          }
          onClick={
            stats.drawdownRange
              ? () =>
                  focusOn(
                    stats.drawdownRange!.from,
                    stats.drawdownRange!.to,
                    `Plus forte baisse : ${formatR(stats.maxDrawdown)}`,
                  )
              : undefined
          }
          actionLabel="Voir sur la courbe"
        />
        <StatTile
          label="Recovery factor"
          value={stats.recoveryFactor}
          format={(v) => formatNumber(v)}
          previous={prev((o) => o.recoveryFactor)}
          formatDelta={(v) => formatNumber(v)}
          info="Total des R ÷ plus forte baisse : combien de fois tes gains couvrent ta pire baisse."
        />
        <StatTile
          label="SQN"
          value={stats.sqn}
          format={(v) => formatNumber(v)}
          tone={(v) => (v >= 2 ? 'gain' : v < 1.6 ? 'loss' : '')}
          previous={prev((o) => o.sqn)}
          formatDelta={(v) => formatNumber(v)}
          detail={sqnLabel(stats.sqn)}
          info="System Quality Number (Van Tharp) : la régularité de tes résultats. Repères : moins de 1,6 faible, 1,6 à 2 moyen, 2 à 3 bon, plus de 3 excellent."
        />
        <StatTile
          label="Pire trade"
          value={stats.worst?.r ?? null}
          format={formatR}
          tone={rClass}
          detail={stats.worst ? `${stats.worst.trade.instrument ?? ''} · ${formatDate(stats.worst.trade)}` : undefined}
          info="Le trade avec le R le plus bas sur la période."
          onClick={stats.worst ? () => openTrade(stats.worst!) : undefined}
          actionLabel="Ouvrir la fiche"
        />
      </Section>

      <Section title="Régularité">
        <StatTile
          label="Trades"
          value={stats.count}
          format={count}
          previous={prev((o) => o.count)}
          higherIsBetter={null}
          formatDelta={count}
          info="Nombre de trades avec un RR closed sur la période (les filtres s'appliquent)."
        />
        <StatTile
          label="Meilleur trade"
          value={stats.best?.r ?? null}
          format={formatR}
          tone={rClass}
          detail={stats.best ? `${stats.best.trade.instrument ?? ''} · ${formatDate(stats.best.trade)}` : undefined}
          info="Le trade avec le R le plus haut sur la période."
          onClick={stats.best ? () => openTrade(stats.best!) : undefined}
          actionLabel="Ouvrir la fiche"
        />
        <StatTile
          label="Série gagnante max"
          value={stats.longestWinStreak}
          format={tradesCount}
          previous={prev((o) => o.longestWinStreak)}
          formatDelta={count}
          info="Le plus grand nombre de trades gagnants d'affilée. Un BE interrompt la série."
          onClick={stats.longestWin ? () => focusStreak(stats.longestWin!, 'Plus longue série gagnante') : undefined}
          actionLabel="Voir sur la courbe"
        />
        <StatTile
          label="Série perdante max"
          value={stats.longestLossStreak}
          format={tradesCount}
          previous={prev((o) => o.longestLossStreak)}
          higherIsBetter={false}
          formatDelta={count}
          info="Le plus grand nombre de trades perdants d'affilée. Un BE interrompt la série."
          onClick={stats.longestLoss ? () => focusStreak(stats.longestLoss!, 'Plus longue série perdante') : undefined}
          actionLabel="Voir sur la courbe"
        />
        <StatTile
          label="Trades à BE"
          value={stats.beRate}
          format={formatPercent}
          previous={prev((o) => o.beRate)}
          higherIsBetter={null}
          formatDelta={pointsGap}
          info="Part des trades clôturés à 0 R."
        />
      </Section>

      <motion.div variants={riseIn}>
        <EquityPanel
          stats={stats}
          zoom={focus.zoom}
          highlight={focus.highlight}
          navigatorVersion={focus.version}
          onZoomChange={(zoom) => setFocusState((f) => ({ ...focus, key: dataKey, zoom, version: f.version }))}
          onReset={() => setFocusState((f) => ({ key: dataKey, zoom: null, highlight: null, version: f.version + 1 }))}
          panelRef={panelRef}
        />
      </motion.div>

      <RollingPanel curve={stats.curve} overall={{ expectancy: stats.avgR, winRate: stats.winRate }} />
    </motion.div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="tile-section">
      <motion.h3 className="section-title" variants={riseIn}>
        {title}
      </motion.h3>
      <motion.div className="tiles" variants={stagger}>
        {children}
      </motion.div>
    </section>
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
                <stop offset="0%" stopColor={c.electric} stopOpacity={0.5} />
                <stop offset="100%" stopColor={c.electric} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="cumR"
              stroke={c.electric}
              strokeWidth={2}
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
