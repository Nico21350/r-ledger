import { PageState } from '../components/PageState'
import { useFilteredTrades, usePageTitle } from '../hooks/useFilters'

// Écran prévu en phase D (mosaïque de captures, plein écran, navigation au clavier).
export function GalleryPage() {
  usePageTitle('Galerie')
  const { trades, allTrades, isPending, error } = useFilteredTrades()

  return (
    <>
      <h2>Galerie</h2>
      <PageState isPending={isPending} error={error} total={allTrades.length} filtered={trades.length}>
        <div className="panel">
          <p className="muted">
            Cet écran arrive en phase D. Il montrera les captures des {trades.length} trades sélectionnés par les filtres.
          </p>
        </div>
      </PageState>
    </>
  )
}
