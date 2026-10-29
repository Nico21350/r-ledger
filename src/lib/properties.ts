import { weekday } from './dimensions'
import type { Trade } from './trades'

// Propriétés Notion d'un trade, dans l'ordre d'affichage (fiche trade, comparaison).
export function tradeProperties(t: Trade): [string, string | null][] {
  return [
    ['Résultat Notion', t.notion_result],
    ['Pris', t.taken ? 'Oui' : 'Non'],
    ['Jour', weekday(t)],
    ['Session', t.ny_hour],
    ['HTF range TF', t.htf_range_tf],
    ['LTF retracement TF', t.ltf_retracement_tf],
    ['FVG against présent', t.fvg_against ? 'Oui' : 'Non'],
    ['SL placement', t.sl_placement],
    ['TP', t.tp],
    ['Achievable RR', t.achievable_rr_text],
    ['BE', t.be_effect],
    ['Émotions', t.emotions],
  ]
}
