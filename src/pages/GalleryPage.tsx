import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Lightbox, type LightboxItem } from '../components/Lightbox'
import { PageState } from '../components/PageState'
import { Segmented } from '../components/Segmented'
import { useFilteredTrades, usePageTitle } from '../hooks/useFilters'
import { useCaptures } from '../lib/queries'
import { formatDate, formatR, rClass } from '../lib/trades'

type Outcome = 'tous' | 'gains' | 'pertes' | 'be'
type Sort = 'recent' | 'ancien' | 'meilleur' | 'pire'
type Show = 'toutes' | 'une'

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'gains', label: 'Gains' },
  { value: 'pertes', label: 'Pertes' },
  { value: 'be', label: 'BE' },
]

const SORTS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'ancien', label: 'Plus anciens' },
  { value: 'meilleur', label: 'Meilleurs R' },
  { value: 'pire', label: 'Pires R' },
]

const SHOWS: { value: Show; label: string }[] = [
  { value: 'toutes', label: 'Toutes les captures' },
  { value: 'une', label: 'Une par trade' },
]

// Mosaïque des captures TradingView des trades filtrés ; un clic ouvre le plein écran.
export function GalleryPage() {
  usePageTitle('Galerie')
  const { trades, allTrades, isPending, error } = useFilteredTrades()
  const captures = useCaptures()
  const [outcome, setOutcome] = useState<Outcome>('tous')
  const [sort, setSort] = useState<Sort>('recent')
  const [show, setShow] = useState<Show>('toutes')
  const [open, setOpen] = useState<number | null>(null)

  const items = useMemo<LightboxItem[]>(() => {
    const byTrade = captures.data
    if (!byTrade) return []
    const kept = trades.filter((t) => {
      const r = t.rr_closed
      if (outcome === 'gains') return r !== null && r > 0
      if (outcome === 'pertes') return r !== null && r < 0
      if (outcome === 'be') return r === 0
      return true
    })
    const sorted = [...kept].sort((a, b) => {
      if (sort === 'meilleur' || sort === 'pire') {
        const diff = (b.rr_closed ?? -Infinity) - (a.rr_closed ?? -Infinity)
        return sort === 'meilleur' ? diff : -diff
      }
      const diff = (b.traded_at ?? '').localeCompare(a.traded_at ?? '')
      return sort === 'recent' ? diff : -diff
    })
    return sorted.flatMap((trade) => {
      const list = byTrade.get(trade.id) ?? []
      return (show === 'une' ? list.slice(0, 1) : list).map((capture) => ({ capture, trade }))
    })
  }, [captures.data, trades, outcome, sort, show])

  const tradeCount = new Set(items.map((i) => i.trade.id)).size

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Galerie</h2>
          <p className="muted">
            {captures.isPending
              ? 'Chargement des captures…'
              : `${items.length} capture${items.length > 1 ? 's' : ''} de ${tradeCount} trade${tradeCount > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="toolbar">
          <Segmented id="gallery-outcome" label="Résultat" options={OUTCOMES} value={outcome} onChange={setOutcome} />
          <Segmented id="gallery-sort" label="Ordre" options={SORTS} value={sort} onChange={setSort} />
          <Segmented id="gallery-show" label="Captures affichées" options={SHOWS} value={show} onChange={setShow} />
        </div>
      </div>

      <PageState isPending={isPending} error={error ?? captures.error} total={allTrades.length} filtered={trades.length}>
        {captures.isPending ? (
          <div className="gallery">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton gallery-skeleton" style={{ height: 160 + (i % 3) * 60 }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="muted">Aucune capture pour cette sélection.</p>
        ) : (
          <motion.div className="gallery" layout>
            <AnimatePresence mode="popLayout">
              {items.map((item, i) => (
                <motion.button
                  key={item.capture.id}
                  type="button"
                  layout
                  className="gallery-item"
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.35, delay: Math.min(i, 20) * 0.025, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4 }}
                  onClick={() => setOpen(i)}
                  aria-label={`Agrandir la capture du trade ${item.trade.instrument ?? ''} du ${formatDate(item.trade)}`}
                >
                  <img src={item.capture.url} alt="" loading="lazy" />
                  <span className="gallery-caption">
                    <span>
                      <strong>
                        {item.trade.instrument ?? '—'} {item.trade.direction ?? ''}
                      </strong>
                      <span className="muted">
                        {formatDate(item.trade)}
                        {item.trade.ny_hour && ` · ${item.trade.ny_hour}`}
                      </span>
                    </span>
                    {item.trade.rr_closed !== null && (
                      <span className={`r-badge ${rClass(item.trade.rr_closed)}`}>{formatR(item.trade.rr_closed)}</span>
                    )}
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </PageState>

      <Lightbox items={items} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} />
    </>
  )
}
