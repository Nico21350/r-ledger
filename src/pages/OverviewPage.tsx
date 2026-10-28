import { Overview } from '../components/Overview'
import { PageState } from '../components/PageState'
import { useFilteredTrades, usePageTitle } from '../hooks/useFilters'

export function OverviewPage() {
  usePageTitle("Vue d'ensemble")
  const { trades, allTrades, isPending, error } = useFilteredTrades()

  return (
    <>
      <h2>Vue d'ensemble</h2>
      <PageState isPending={isPending} error={error} total={allTrades.length} filtered={trades.length}>
        <Overview trades={trades} />
      </PageState>
    </>
  )
}
