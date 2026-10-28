// Un trade tel que stocké dans la table Supabase "trades".
export type Trade = {
  id: string
  instrument: string | null
  direction: string | null
  traded_at: string | null
  has_time: boolean
  ny_hour: string | null
  notion_result: string | null
  rr_closed: number | null
  outcome: 'win' | 'loss' | 'be' | null
  taken: boolean
}

export type TakenFilter = 'all' | 'taken' | 'not_taken'

export function filterTrades(trades: Trade[], filter: TakenFilter): Trade[] {
  if (filter === 'taken') return trades.filter((t) => t.taken)
  if (filter === 'not_taken') return trades.filter((t) => !t.taken)
  return trades
}

// "+1,5 R" / "−1 R" : le signe est toujours écrit, la couleur n'est jamais la seule information.
export function formatR(r: number, digits = 2): string {
  const rounded = Number(r.toFixed(digits))
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return `${sign}${Math.abs(rounded).toLocaleString('fr-BE', { maximumFractionDigits: digits })} R`
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
