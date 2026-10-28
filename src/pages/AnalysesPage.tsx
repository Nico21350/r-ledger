import { PageState } from '../components/PageState'
import { useFilteredTrades, usePageTitle } from '../hooks/useFilters'

// Écran prévu en phase C (croisements, carte jour × heure, calendrier, Monte-Carlo…).
export function AnalysesPage() {
  usePageTitle('Analyses')
  const { trades, allTrades, isPending, error } = useFilteredTrades()

  return (
    <>
      <h2>Analyses</h2>
      <PageState isPending={isPending} error={error} total={allTrades.length} filtered={trades.length}>
        <div className="panel">
          <p className="muted">
            Cet écran arrive en phase C. Il portera sur les {trades.length} trades sélectionnés par les filtres.
          </p>
        </div>
      </PageState>
    </>
  )
}
