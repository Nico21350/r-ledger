import { CRITERION_KEYS, DIMENSION_BY_KEY, type CriterionKey, type DimensionKey } from './dimensions'
import { brusselsDay, type Trade } from './trades'

export { SESSION_ORDER } from './dimensions'

// Filtre global, partagé par tous les écrans et gardé dans l'adresse de la page :
// /analyses?du=2026-05-01&instrument=NQ1!&session=NY-1&sens=BUY&trades=pris&jour=Mardi
export type Filters = {
  from: string | null // AAAA-MM-JJ, heure de Bruxelles, inclus
  to: string | null
  instruments: string[]
  sessions: string[]
  direction: 'BUY' | 'SELL' | null
  taken: 'pris' | 'non-pris' | null
  // Critères appliqués depuis l'écran Analyses (jour, HTF, émotions…), une valeur par critère.
  criteria: Partial<Record<CriterionKey, string>>
}

export const EMPTY_FILTERS: Filters = {
  from: null,
  to: null,
  instruments: [],
  sessions: [],
  direction: null,
  taken: null,
  criteria: {},
}

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

export function parseFilters(params: URLSearchParams): Filters {
  const list = (key: string) => params.get(key)?.split(',').filter(Boolean) ?? []
  const date = (key: string) => {
    const value = params.get(key)
    return value && DATE_FORMAT.test(value) ? value : null
  }
  const direction = params.get('sens')
  const taken = params.get('trades')
  const criteria: Filters['criteria'] = {}
  for (const key of CRITERION_KEYS) {
    const value = params.get(key)
    if (value) criteria[key] = value
  }
  return {
    from: date('du'),
    to: date('au'),
    instruments: list('instrument'),
    sessions: list('session'),
    direction: direction === 'BUY' || direction === 'SELL' ? direction : null,
    taken: taken === 'pris' || taken === 'non-pris' ? taken : null,
    criteria,
  }
}

export function serializeFilters(filters: Filters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.from) params.set('du', filters.from)
  if (filters.to) params.set('au', filters.to)
  if (filters.instruments.length) params.set('instrument', filters.instruments.join(','))
  if (filters.sessions.length) params.set('session', filters.sessions.join(','))
  if (filters.direction) params.set('sens', filters.direction)
  if (filters.taken) params.set('trades', filters.taken)
  for (const key of CRITERION_KEYS) {
    const value = filters.criteria[key]
    if (value) params.set(key, value)
  }
  return params
}

export function applyFilters(trades: Trade[], filters: Filters): Trade[] {
  return trades.filter((t) => {
    if (filters.from || filters.to) {
      // Un trade sans date ne peut pas appartenir à une période.
      const day = brusselsDay(t.traded_at)
      if (!day) return false
      if (filters.from && day < filters.from) return false
      if (filters.to && day > filters.to) return false
    }
    if (filters.instruments.length && !filters.instruments.includes(t.instrument ?? '')) return false
    if (filters.sessions.length && !filters.sessions.includes(t.ny_hour ?? '')) return false
    if (filters.direction && t.direction !== filters.direction) return false
    if (filters.taken === 'pris' && !t.taken) return false
    if (filters.taken === 'non-pris' && t.taken) return false
    for (const key of CRITERION_KEYS) {
      const value = filters.criteria[key]
      if (value && DIMENSION_BY_KEY[key].get(t) !== value) return false
    }
    return true
  })
}

// Nombre de filtres actifs, affiché sur le bouton "Filtres". La période compte pour un.
export function countActiveFilters(filters: Filters): number {
  return (
    Number(Boolean(filters.from || filters.to)) +
    Number(filters.instruments.length > 0) +
    Number(filters.sessions.length > 0) +
    Number(filters.direction !== null) +
    Number(filters.taken !== null) +
    CRITERION_KEYS.filter((k) => filters.criteria[k]).length
  )
}

// Filtre sur une seule valeur d'une dimension (clic sur une barre de croisement).
export function withDimension(filters: Filters, key: DimensionKey, value: string): Filters {
  switch (key) {
    case 'instrument':
      return { ...filters, instruments: [value] }
    case 'session':
      return { ...filters, sessions: [value] }
    case 'sens':
      return { ...filters, direction: value === 'SELL' ? 'SELL' : 'BUY' }
    case 'pris':
      return { ...filters, taken: value === 'Non pris' ? 'non-pris' : 'pris' }
    default:
      return { ...filters, criteria: { ...filters.criteria, [key]: value } }
  }
}

// La dimension est-elle filtrée sur exactement cette valeur ?
export function hasDimension(filters: Filters, key: DimensionKey, value: string): boolean {
  switch (key) {
    case 'instrument':
      return filters.instruments.length === 1 && filters.instruments[0] === value
    case 'session':
      return filters.sessions.length === 1 && filters.sessions[0] === value
    case 'sens':
      return filters.direction === value
    case 'pris':
      return filters.taken === (value === 'Non pris' ? 'non-pris' : 'pris')
    default:
      return filters.criteria[key] === value
  }
}

// Retire le filtre d'une dimension.
export function withoutDimension(filters: Filters, key: DimensionKey): Filters {
  switch (key) {
    case 'instrument':
      return { ...filters, instruments: [] }
    case 'session':
      return { ...filters, sessions: [] }
    case 'sens':
      return { ...filters, direction: null }
    case 'pris':
      return { ...filters, taken: null }
    default: {
      const criteria = { ...filters.criteria }
      delete criteria[key]
      return { ...filters, criteria }
    }
  }
}

export type PeriodPreset = 'tout' | '30j' | '3m' | 'annee'

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'tout', label: 'Tout' },
  { value: '30j', label: '30 derniers jours' },
  { value: '3m', label: '3 derniers mois' },
  { value: 'annee', label: 'Cette année' },
]

// Période correspondant à un raccourci, à partir de la date du jour (AAAA-MM-JJ).
export function presetRange(preset: PeriodPreset, today: string): Pick<Filters, 'from' | 'to'> {
  if (preset === 'tout') return { from: null, to: null }
  if (preset === 'annee') return { from: `${today.slice(0, 4)}-01-01`, to: today }

  const d = new Date(`${today}T00:00:00Z`)
  if (preset === '30j') {
    d.setUTCDate(d.getUTCDate() - 29)
  } else {
    // 3 mois en arrière ; le 31 mai devient le 28 février, pas le 3 mars.
    const day = d.getUTCDate()
    d.setUTCDate(1)
    d.setUTCMonth(d.getUTCMonth() - 3)
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
    d.setUTCDate(Math.min(day, lastDay))
  }
  return { from: d.toISOString().slice(0, 10), to: today }
}

// Période de même durée juste avant la période filtrée, pour comparer.
// Sans date de début, il n'y a rien à comparer ; sans date de fin, la période va jusqu'à aujourd'hui.
export function previousRange(filters: Filters, today: string): { from: string; to: string } | null {
  if (!filters.from) return null
  const day = 24 * 60 * 60 * 1000
  const start = Date.parse(`${filters.from}T00:00:00Z`)
  const end = Date.parse(`${filters.to ?? today}T00:00:00Z`)
  if (end < start) return null
  const length = end - start + day
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  return { from: iso(start - length), to: iso(start - day) }
}

export function todayInBrussels(): string {
  return brusselsDay(new Date().toISOString())!
}
