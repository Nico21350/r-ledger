import { weekday } from './dimensions'
import { type Trade } from './trades'

// Export des trades en CSV, lisible directement par Excel en français :
// séparateur « ; », virgule décimale, et une marque UTF-8 au début pour que les accents s'affichent bien.
// Uniquement des R, aucun montant.

const COLUMNS: [string, (t: Trade) => string | number | boolean | null][] = [
  ['Date (Bruxelles)', (t) => (t.traded_at ? brusselsDateTime(t) : null)],
  ['Jour', weekday],
  ['Instrument', (t) => t.instrument],
  ['Sens', (t) => t.direction],
  ['Session', (t) => t.ny_hour],
  ['HTF range TF', (t) => t.htf_range_tf],
  ['LTF retracement TF', (t) => t.ltf_retracement_tf],
  ['FVG against', (t) => t.fvg_against],
  ['SL placement', (t) => t.sl_placement],
  ['TP', (t) => t.tp],
  ['Résultat Notion', (t) => t.notion_result],
  ['Pris', (t) => t.taken],
  ['RR closed', (t) => t.rr_closed],
  ['Achievable RR', (t) => t.achievable_rr_text],
  ['BE', (t) => t.be_effect],
  ['Émotions', (t) => t.emotions],
  ['Trade narrative', (t) => t.narrative],
]

function brusselsDateTime(t: Trade): string {
  const parts = new Intl.DateTimeFormat('fr-BE', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(t.has_time && { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const }),
  }).formatToParts(new Date(t.traded_at!))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const date = `${get('year')}-${get('month')}-${get('day')}`
  return t.has_time ? `${date} ${get('hour')}:${get('minute')}` : date
}

// Une cellule : guillemets si elle contient ; " ou un retour à la ligne (règle du format CSV).
function cell(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return ''
  const text =
    typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : typeof value === 'number' ? String(value).replace('.', ',') : value
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function tradesToCsv(trades: Trade[]): string {
  const lines = [COLUMNS.map(([name]) => cell(name)).join(';'), ...trades.map((t) => COLUMNS.map(([, get]) => cell(get(t))).join(';'))]
  return `﻿${lines.join('\r\n')}\r\n`
}

// Fait télécharger le fichier par le navigateur.
export function downloadCsv(trades: Trade[], filename: string) {
  const url = URL.createObjectURL(new Blob([tradesToCsv(trades)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
