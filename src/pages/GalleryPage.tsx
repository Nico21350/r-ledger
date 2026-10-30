import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Lightbox, type LightboxItem } from '../components/Lightbox'
import { PageState } from '../components/PageState'
import { Segmented } from '../components/Segmented'
import { useFilteredTrades, usePageTitle } from '../hooks/useFilters'
import { useCaptures } from '../lib/queries'
import { brusselsDay, formatR, rClass } from '../lib/trades'

type Outcome = 'tous' | 'gains' | 'pertes' | 'be'
type Sort = 'recent' | 'ancien' | 'meilleur' | 'pire'

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

// Une carte par jour : toutes les captures des trades de ce jour, et leur total en R.
type Day = { day: string | null; items: LightboxItem[]; trades: number; instruments: string[]; totalR: number }

const dayLabel = (day: string | null) =>
  day
    ? new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Sans date'

// Mosaïque des captures, regroupées par jour ; un clic ouvre toutes les captures du jour en plein écran.
export function GalleryPage() {
  usePageTitle('Galerie')
  const { trades, allTrades, isPending, error } = useFilteredTrades()
  const captures = useCaptures()
  const [outcome, setOutcome] = useState<Outcome>('tous')
  const [sort, setSort] = useState<Sort>('recent')
  const [open, setOpen] = useState<{ day: Day; index: number } | null>(null)

  const days = useMemo<Day[]>(() => {
    const byTrade = captures.data
    if (!byTrade) return []
    const groups = new Map<string | null, Day>()
    for (const trade of trades) {
      const r = trade.rr_closed
      if (outcome === 'gains' && !(r !== null && r > 0)) continue
      if (outcome === 'pertes' && !(r !== null && r < 0)) continue
      if (outcome === 'be' && r !== 0) continue
      const shots = byTrade.get(trade.id) ?? []
      if (shots.length === 0) continue
      const key = brusselsDay(trade.traded_at)
      const group = groups.get(key) ?? { day: key, items: [], trades: 0, instruments: [], totalR: 0 }
      group.items.push(...shots.map((capture) => ({ capture, trade })))
      group.trades++
      group.totalR += r ?? 0
      if (trade.instrument && !group.instruments.includes(trade.instrument)) group.instruments.push(trade.instrument)
      groups.set(key, group)
    }
    return [...groups.values()].sort((a, b) => {
      if (sort === 'meilleur') return b.totalR - a.totalR
      if (sort === 'pire') return a.totalR - b.totalR
      const diff = (b.day ?? '').localeCompare(a.day ?? '')
      return sort === 'recent' ? diff : -diff
    })
  }, [captures.data, trades, outcome, sort])

  const captureCount = days.reduce((sum, d) => sum + d.items.length, 0)

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Galerie</h2>
          <p className="panel-lede">Les captures d'écran des graphiques, regroupées par jour de trading.</p>
          <p className="muted">
            {captures.isPending
              ? 'Chargement des captures…'
              : `${days.length} jour${days.length > 1 ? 's' : ''} · ${captureCount} capture${captureCount > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="toolbar gallery-toolbar">
          <Segmented id="gallery-outcome" label="Résultat" options={OUTCOMES} value={outcome} onChange={setOutcome} />
          <Segmented id="gallery-sort" label="Ordre" options={SORTS} value={sort} onChange={setSort} />
        </div>
      </div>

      <PageState isPending={isPending} error={error ?? captures.error} total={allTrades.length} filtered={trades.length}>
        {captures.isPending ? (
          <div className="gallery">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton gallery-skeleton" />
            ))}
          </div>
        ) : days.length === 0 ? (
          <p className="muted">Aucune capture pour cette sélection.</p>
        ) : (
          <motion.div className="gallery" layout>
            <AnimatePresence mode="popLayout">
              {days.map((d, i) => (
                <motion.button
                  key={d.day ?? 'sans-date'}
                  type="button"
                  layout
                  className={`gallery-item${d.items.length > 1 ? ' stacked' : ''}`}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.35, delay: Math.min(i, 20) * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4 }}
                  onClick={() => setOpen({ day: d, index: 0 })}
                  aria-label={`Voir les ${d.items.length} captures du ${dayLabel(d.day)}`}
                >
                  <span className="gallery-frame">
                    <img src={d.items[0].capture.url} alt="" loading="lazy" />
                    {d.items.length > 1 && <span className="gallery-count">{d.items.length} captures</span>}
                    <span className="gallery-caption">
                    <span>
                      <strong className="gallery-date">{dayLabel(d.day)}</strong>
                      <span className="muted">
                        {d.instruments.join(', ') || '—'} · {d.trades} trade{d.trades > 1 ? 's' : ''}
                      </span>
                    </span>
                      <span className={`r-badge ${rClass(d.totalR)}`}>{formatR(d.totalR)}</span>
                    </span>
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </PageState>

      <Lightbox
        items={open?.day.items ?? []}
        index={open?.index ?? null}
        onIndexChange={(index) => setOpen((o) => (o ? { ...o, index } : o))}
        onClose={() => setOpen(null)}
      />
    </>
  )
}
