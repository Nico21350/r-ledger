import { useState } from 'react'
import { DEFAULT_INDICATORS, parseChoice, type IndicatorId } from '../lib/indicators'

const KEY = 'r-ledger:indicateurs'

// Indicateurs choisis pour la vue d'ensemble, mémorisés dans le navigateur.
// Si cette mémoire est indisponible (navigation privée, blocage), le choix vaut pour la visite en cours.
export function useIndicatorChoice() {
  const [choice, setChoice] = useState<IndicatorId[]>(() => {
    try {
      return parseChoice(localStorage.getItem(KEY))
    } catch {
      return DEFAULT_INDICATORS
    }
  })

  function save(next: IndicatorId[]) {
    setChoice(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // Mémoire indisponible : rien à faire, le choix reste valable jusqu'au rechargement.
    }
  }

  return [choice, save] as const
}
