import { brusselsHour, weekday } from './dimensions'
import { formatDate, formatR, type Trade } from './trades'

// Texte en minuscules, sans accents : « Émotions » et « emotions » se retrouvent.
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

// Tout ce qu'on peut taper pour retrouver un trade : instrument, sens, date, jour, session, R, textes…
function haystack(t: Trade): string {
  return normalize(
    [
      t.instrument,
      t.direction,
      formatDate(t),
      weekday(t),
      brusselsHour(t),
      t.ny_hour,
      t.htf_range_tf,
      t.ltf_retracement_tf,
      t.sl_placement,
      t.tp,
      t.notion_result,
      t.be_effect,
      t.emotions,
      t.achievable_rr_text,
      t.rr_closed === null ? null : formatR(t.rr_closed),
      t.rr_closed === null ? null : `${t.rr_closed}r`,
      t.taken ? 'pris' : 'non pris',
      t.narrative,
      t.review,
    ]
      .filter(Boolean)
      .join(' '),
  )
}

// Un trade correspond si chaque mot tapé apparaît quelque part dans ses informations.
// Les plus récents d'abord.
export function searchTrades(trades: Trade[], query: string, limit = 8): Trade[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  return trades
    .filter((t) => {
      const text = haystack(t)
      return words.every((w) => text.includes(w))
    })
    .reverse()
    .slice(0, limit)
}

// Trades précédent et suivant dans la liste (ordre chronologique), et la position du trade.
export function neighbours(trades: Trade[], id: string): { index: number; previous: Trade | null; next: Trade | null } {
  const index = trades.findIndex((t) => t.id === id)
  if (index === -1) return { index, previous: null, next: null }
  return { index, previous: trades[index - 1] ?? null, next: trades[index + 1] ?? null }
}
