import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { applyFilters, parseFilters, serializeFilters, type Filters } from '../lib/filters'
import { useTrades } from '../lib/queries'

// Lit et modifie le filtre global, stocké dans l'adresse de la page.
export function useFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])
  const setFilters = useCallback(
    (next: Filters) => setParams(serializeFilters(next), { replace: true }),
    [setParams],
  )
  return { filters, setFilters }
}

// Les trades après application du filtre global.
export function useFilteredTrades() {
  const query = useTrades()
  const { filters } = useFilters()
  const trades = useMemo(() => (query.data ? applyFilters(query.data, filters) : []), [query.data, filters])
  return { ...query, trades, allTrades: query.data ?? [] }
}

// Titre de l'onglet du navigateur, propre à chaque écran.
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · R Ledger`
  }, [title])
}
