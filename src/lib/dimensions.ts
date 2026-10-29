import type { Trade } from './trades'

// Les colonnes de Notion qu'on peut croiser avec les résultats (écran Analyses).
// Chaque dimension sait lire sa valeur dans un trade ; null = non renseigné.

// Ordre d'affichage des sessions (celui de la journée, pas l'ordre alphabétique).
export const SESSION_ORDER = ['London', 'NY-1', 'NY-2', 'NY-3', 'Outside Wo0']

export const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// Critères qui n'existent pas dans le menu des filtres, mais qu'un clic dans l'écran Analyses peut appliquer.
// La clé sert aussi de nom dans l'adresse de la page : ?jour=Mardi&htf=H1
export const CRITERION_KEYS = ['jour', 'htf', 'ltf', 'fvg', 'sl', 'tp', 'emotion', 'be'] as const
export type CriterionKey = (typeof CRITERION_KEYS)[number]

export type DimensionKey = 'instrument' | 'session' | 'sens' | 'pris' | CriterionKey

export type Dimension = {
  key: DimensionKey
  label: string
  get: (trade: Trade) => string | null
  order?: string[] // ordre d'affichage imposé ; sinon ordre alphabétique
}

const weekdayFormat = new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', weekday: 'long' })
const hourFormat = new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', hour: 'numeric', hourCycle: 'h23' })

// Jour de la semaine à Bruxelles, calculé depuis la date (plus fiable que la colonne texte "Day").
export function weekday(trade: Trade): string | null {
  if (!trade.traded_at) return null
  const name = weekdayFormat.format(new Date(trade.traded_at))
  return name.charAt(0).toUpperCase() + name.slice(1)
}

// Heure de Bruxelles ("15h") ; null si Notion n'avait pas d'heure pour ce trade.
export function brusselsHour(trade: Trade): string | null {
  if (!trade.traded_at || !trade.has_time) return null
  return `${parseInt(hourFormat.format(new Date(trade.traded_at)), 10)}h`
}

export const DIMENSIONS: Dimension[] = [
  { key: 'instrument', label: 'Instrument', get: (t) => t.instrument },
  { key: 'session', label: 'Session', get: (t) => t.ny_hour, order: SESSION_ORDER },
  { key: 'jour', label: 'Jour', get: weekday, order: WEEKDAYS },
  { key: 'sens', label: 'BUY / SELL', get: (t) => t.direction, order: ['BUY', 'SELL'] },
  { key: 'htf', label: 'HTF range', get: (t) => t.htf_range_tf, order: ['H4', 'H1', '15min'] },
  { key: 'ltf', label: 'LTF retracement', get: (t) => t.ltf_retracement_tf, order: ['15min', '5min', '1min'] },
  { key: 'fvg', label: 'FVG against', get: (t) => (t.fvg_against ? 'Oui' : 'Non'), order: ['Oui', 'Non'] },
  { key: 'sl', label: 'SL', get: (t) => t.sl_placement },
  { key: 'tp', label: 'TP', get: (t) => t.tp },
  {
    key: 'emotion',
    label: 'Émotions',
    get: (t) => t.emotions,
    order: ['1 - calme', '2 - légère tension', '3 - charge émotionnelle', 'Not taken'],
  },
  {
    key: 'be',
    label: 'Effet du BE',
    get: (t) => t.be_effect,
    order: ['No BE setup', 'No affect on result', 'Prevented loss', 'Missed win'],
  },
  { key: 'pris', label: 'Pris / non pris', get: (t) => (t.taken === false ? 'Non pris' : 'Pris'), order: ['Pris', 'Non pris'] },
]

export const DIMENSION_BY_KEY = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d])) as Record<DimensionKey, Dimension>

// Range des valeurs selon l'ordre imposé, puis par ordre alphabétique ; « non renseigné » (null) en dernier.
export function compareValues(order: string[] | undefined, a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  const ia = order?.indexOf(a) ?? -1
  const ib = order?.indexOf(b) ?? -1
  if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib)
  return a.localeCompare(b, 'fr', { numeric: true })
}
