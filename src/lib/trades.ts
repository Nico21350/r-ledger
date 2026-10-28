import type { Tables } from './database.types'

// Un trade tel que stocké dans la table Supabase "trades" (type généré par `npm run types`).
export type Trade = Tables<'trades'>

// "+1,5 R" / "−1 R" : le signe est toujours écrit, la couleur n'est jamais la seule information.
export function formatR(r: number, digits = 2): string {
  const rounded = Number(r.toFixed(digits))
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return `${sign}${Math.abs(rounded).toLocaleString('fr-BE', { maximumFractionDigits: digits })} R`
}

// Nombre sans unité (ratio, SQN…) ; un profit factor sans aucune perte vaut l'infini.
export function formatNumber(x: number, digits = 2): string {
  if (x === Infinity) return '∞'
  return x.toLocaleString('fr-BE', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

export function formatPercent(x: number): string {
  return `${Math.round(x * 100)} %`
}

export function rClass(r: number): string {
  return r > 0 ? 'gain' : r < 0 ? 'loss' : ''
}

// Date en heure de Bruxelles ; sans heure si Notion n'en avait pas.
export function formatDate(trade: Trade): string {
  if (!trade.traded_at) return 'Sans date'
  return new Date(trade.traded_at).toLocaleString('fr-BE', {
    timeZone: 'Europe/Brussels',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(trade.has_time && { hour: '2-digit', minute: '2-digit' }),
  })
}

// Jour calendaire à Bruxelles, au format AAAA-MM-JJ (ex. 2026-05-12).
export function brusselsDay(iso: string | null): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date(iso))
}
