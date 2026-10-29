import { AnimatePresence, motion } from 'motion/react'
import { useFilters } from '../hooks/useFilters'
import { CRITERION_KEYS, DIMENSION_BY_KEY } from '../lib/dimensions'
import { countActiveFilters, EMPTY_FILTERS, withoutDimension, type Filters } from '../lib/filters'

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })

type Pill = { id: string; label: string; remove: (f: Filters) => Filters }

function pills(filters: Filters): Pill[] {
  const list: Pill[] = []
  if (filters.from || filters.to) {
    const label = filters.from && filters.to
      ? `${shortDate(filters.from)} → ${shortDate(filters.to)}`
      : filters.from
        ? `Depuis le ${shortDate(filters.from)}`
        : `Jusqu'au ${shortDate(filters.to!)}`
    list.push({ id: 'periode', label, remove: (f) => ({ ...f, from: null, to: null }) })
  }
  if (filters.instruments.length)
    list.push({ id: 'instrument', label: filters.instruments.join(', '), remove: (f) => withoutDimension(f, 'instrument') })
  if (filters.sessions.length)
    list.push({ id: 'session', label: `Session ${filters.sessions.join(', ')}`, remove: (f) => withoutDimension(f, 'session') })
  if (filters.direction) list.push({ id: 'sens', label: filters.direction, remove: (f) => withoutDimension(f, 'sens') })
  if (filters.taken)
    list.push({
      id: 'pris',
      label: filters.taken === 'pris' ? 'Trades pris' : 'Trades non pris',
      remove: (f) => withoutDimension(f, 'pris'),
    })
  for (const key of CRITERION_KEYS) {
    const value = filters.criteria[key]
    if (value)
      list.push({ id: key, label: `${DIMENSION_BY_KEY[key].label} : ${value}`, remove: (f) => withoutDimension(f, key) })
  }
  return list
}

// Pastilles des filtres actifs sous la barre du haut ; la croix retire un filtre.
export function ActiveFilters() {
  const { filters, setFilters } = useFilters()
  const list = pills(filters)

  return (
    <AnimatePresence initial={false}>
      {list.length > 0 && (
        <motion.div
          className="active-filters"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="active-filters-inner">
            <span className="muted">Filtres actifs :</span>
            <AnimatePresence initial={false} mode="popLayout">
              {list.map((p) => (
                <motion.span
                  key={p.id}
                  layout
                  className="filter-pill"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                >
                  {p.label}
                  <button type="button" aria-label={`Retirer le filtre ${p.label}`} onClick={() => setFilters(p.remove(filters))}>
                    ×
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            {countActiveFilters(filters) > 1 && (
              <motion.button layout type="button" className="link-button" onClick={() => setFilters(EMPTY_FILTERS)}>
                Tout retirer
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
