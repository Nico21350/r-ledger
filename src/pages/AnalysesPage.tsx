import { useCallback, useState } from 'react'
import { motion } from 'motion/react'
import { CalendarPanel } from '../components/CalendarPanel'
import { CrossingsPanel } from '../components/CrossingsPanel'
import { HeatmapPanel } from '../components/HeatmapPanel'
import { HistogramPanel } from '../components/HistogramPanel'
import { PageState } from '../components/PageState'
import { TradeDrawer, type DrawerContent } from '../components/TradeDrawer'
import { useFilteredTrades, usePageTitle } from '../hooks/useFilters'
import { MIN_SAMPLE } from '../lib/analysis'
import { riseIn, stagger } from '../lib/motion'

// En dessous, toutes les conclusions de l'écran restent fragiles.
const SMALL_SAMPLE = 30

const SECTIONS = [
  { id: 'croisements', label: 'Croisements' },
  { id: 'jour-session', label: 'Jour × session' },
  { id: 'repartition', label: 'Répartition' },
  { id: 'calendrier', label: 'Calendrier' },
]

export function AnalysesPage() {
  usePageTitle('Analyses')
  const { trades, allTrades, isPending, error } = useFilteredTrades()
  const [drawer, setDrawer] = useState<DrawerContent | null>(null)
  const closeDrawer = useCallback(() => setDrawer(null), [])
  const count = trades.filter((t) => t.rr_closed !== null).length

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Analyses</h2>
          <p className="muted">Ce qui marche, ce qui coûte : tes {count} trades découpés selon chaque colonne de Notion.</p>
        </div>
        <nav className="section-nav" aria-label="Sections de la page">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              {s.label}
            </a>
          ))}
        </nav>
      </div>

      <PageState isPending={isPending} error={error} total={allTrades.length} filtered={trades.length}>
        <motion.div className="analyses" initial="hidden" animate="show" variants={stagger}>
          {count < SMALL_SAMPLE && (
            <motion.p className="sample-warning" variants={riseIn}>
              <strong>Échantillon encore petit : {count} trades.</strong> Les écarts entre deux valeurs peuvent venir du
              hasard. Tout ce qui repose sur moins de {MIN_SAMPLE} trades est affiché en pâle avec la mention « peu
              fiable ».
            </motion.p>
          )}
          <CrossingsPanel trades={trades} onOpen={setDrawer} />
          <div className="analyses-grid">
            <HeatmapPanel trades={trades} onOpen={setDrawer} />
            <HistogramPanel trades={trades} onOpen={setDrawer} />
          </div>
          <CalendarPanel trades={trades} onOpen={setDrawer} />
        </motion.div>
      </PageState>

      <TradeDrawer content={drawer} onClose={closeDrawer} />
    </>
  )
}
