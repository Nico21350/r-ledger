import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { motion } from 'motion/react'
import { Area, AreaChart, ReferenceDot, ResponsiveContainer } from 'recharts'
import { Lightbox } from '../components/Lightbox'
import { useFilteredTrades, usePageTitle } from '../hooks/useFilters'
import { parseAchievable } from '../lib/analysis'
import { riseIn, stagger } from '../lib/motion'
import { useCaptures } from '../lib/queries'
import { tradeProperties } from '../lib/properties'
import { neighbours } from '../lib/search'
import { themeColors } from '../lib/theme'
import { formatDate, formatR, rClass, type Trade } from '../lib/trades'

// Fiche complète d'un trade : résultat, place dans la courbe, captures, propriétés, textes.
// ← → passent au trade précédent / suivant (parmi les trades filtrés).
export function TradePage() {
  const { id = '' } = useParams()
  const { search, key } = useLocation()
  const navigate = useNavigate()
  const { trades: filtered, allTrades, isPending, error } = useFilteredTrades()
  const captures = useCaptures()
  const [open, setOpen] = useState<number | null>(null)
  const c = themeColors()

  const trade = allTrades.find((t) => t.id === id)
  // Si le trade est exclu par les filtres, on navigue parmi tous les trades.
  const list = filtered.some((t) => t.id === id) ? filtered : allTrades
  const { index, previous, next } = neighbours(list, id)
  usePageTitle(trade ? `${trade.instrument ?? 'Trade'} · ${formatDate(trade)}` : 'Trade')

  const goTo = (t: Trade | null) => t && navigate({ pathname: `/trade/${t.id}`, search })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowLeft' && previous) navigate({ pathname: `/trade/${previous.id}`, search })
      if (e.key === 'ArrowRight' && next) navigate({ pathname: `/trade/${next.id}`, search })
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [previous, next, navigate, search])

  // Courbe des R cumulés de la liste, avec la position de ce trade.
  const curve = useMemo(
    () =>
      list
        .filter((t) => t.rr_closed !== null)
        .reduce<{ i: number; cumR: number; id?: string }[]>(
          (acc, t, i) => [...acc, { i: i + 1, cumR: acc[acc.length - 1].cumR + t.rr_closed!, id: t.id }],
          [{ i: 0, cumR: 0 }],
        ),
    [list],
  )
  const here = curve.find((p) => p.id === id)

  // Retour à l'écran d'avant s'il existe dans l'historique, sinon à la vue d'ensemble.
  const back = (
    <button type="button" className="link-button back" onClick={() => (key !== 'default' && window.history.length > 1 ? navigate(-1) : navigate({ pathname: '/', search }))}>
      ← Retour
    </button>
  )

  if (isPending) return <p className="muted">Chargement…</p>
  if (error) return <p className="error">Impossible de charger le trade : {error.message}</p>
  if (!trade) {
    return (
      <>
        {back}
        <p className="muted">Ce trade n'existe pas ou a été supprimé dans Notion.</p>
      </>
    )
  }

  const shots = captures.data?.get(trade.id) ?? []
  const achievable = parseAchievable(trade.achievable_rr_text)

  return (
    <motion.div key={id} className="trade-page" initial="hidden" animate="show" variants={stagger}>
      <div className="trade-nav">
        {back}
        <div className="toolbar">
          <span className="muted">
            Trade {index + 1} sur {list.length}
            {list === allTrades && filtered.length !== allTrades.length && ' (hors filtres)'}
          </span>
          <button type="button" className="secondary small" disabled={!previous} onClick={() => goTo(previous)} title="Raccourci : flèche gauche">
            ← Précédent
          </button>
          <button type="button" className="secondary small" disabled={!next} onClick={() => goTo(next)} title="Raccourci : flèche droite">
            Suivant →
          </button>
          <Link className="button small" to={{ pathname: `/comparer/${trade.id}`, search }}>
            Comparer
          </Link>
        </div>
      </div>

      <motion.header className="trade-hero" variants={riseIn}>
        <div>
          <span className="tile-label">
            {trade.taken ? 'Trade pris' : 'Trade non pris (data)'} · {trade.notion_result ?? '—'}
          </span>
          <h2>
            {trade.instrument ?? '—'} <span className={`direction ${trade.direction === 'SELL' ? 'sell' : 'buy'}`}>{trade.direction ?? ''}</span>
          </h2>
          <p className="muted">
            {formatDate(trade)}
            {trade.ny_hour && ` · session ${trade.ny_hour}`}
          </p>
        </div>
        <div className="trade-hero-r">
          {trade.rr_closed !== null && (
            <motion.strong
              className={`hero-value ${rClass(trade.rr_closed)}`}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
            >
              {formatR(trade.rr_closed)}
            </motion.strong>
          )}
          {achievable !== null && (
            <span className="muted">
              Atteignable : {formatR(achievable)}
              {trade.rr_closed !== null && achievable > Math.max(0, trade.rr_closed) && ` · ${formatR(achievable - Math.max(0, trade.rr_closed)).replace('+', '')} laissés`}
            </span>
          )}
        </div>
        {here && (
          <div className="trade-hero-spark" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve} margin={{ top: 10, right: 10, bottom: 4, left: 10 }}>
                <defs>
                  <linearGradient id="trade-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.violet} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={c.electric} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="linear" dataKey="cumR" stroke={c.muted} strokeWidth={1.5} fill="url(#trade-fill)" dot={false} isAnimationActive={false} />
                <ReferenceDot x={here.i} y={here.cumR} r={7} fill={c.violet} stroke={c.navy} strokeWidth={2} ifOverflow="visible" />
              </AreaChart>
            </ResponsiveContainer>
            <span className="muted">Place du trade dans la courbe</span>
          </div>
        )}
      </motion.header>

      {shots.length > 0 && (
        <motion.section className="panel" variants={riseIn}>
          <h3>
            Captures <span className="muted">({shots.length})</span>
          </h3>
          <div className="trade-shots">
            {shots.map((s, i) => (
              <motion.button
                key={s.id}
                type="button"
                className="trade-shot"
                whileHover={{ scale: 1.02 }}
                onClick={() => setOpen(i)}
                aria-label={`Agrandir la capture ${i + 1}`}
              >
                <img src={s.url} alt={`Capture ${i + 1}`} loading="lazy" />
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}

      <div className="trade-columns">
        <motion.section className="panel" variants={riseIn}>
          <h3>Propriétés</h3>
          <dl className="props">
            {tradeProperties(trade).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </motion.section>

        <div className="trade-texts">
          <motion.section className="panel" variants={riseIn}>
            <h3>Trade narrative</h3>
            {trade.narrative ? <p className="prose">{trade.narrative}</p> : <p className="muted">Pas de narrative dans Notion.</p>}
          </motion.section>
          <motion.section className="panel" variants={riseIn}>
            <h3>Review</h3>
            {trade.review ? <p className="prose">{trade.review}</p> : <p className="muted">Pas de review écrite dans la page Notion.</p>}
          </motion.section>
        </div>
      </div>

      <Lightbox
        items={shots.map((capture) => ({ capture, trade }))}
        index={open}
        onIndexChange={setOpen}
        onClose={() => setOpen(null)}
      />
    </motion.div>
  )
}
