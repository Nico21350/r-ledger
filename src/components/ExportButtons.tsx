import { downloadCsv } from '../lib/csv'
import { todayInBrussels } from '../lib/filters'
import type { Trade } from '../lib/trades'

// Export des trades filtrés : tableau CSV (Excel), ou PDF via l'impression du navigateur
// (mise en page dédiée dans index.css, rubrique « Impression »).
export function ExportButtons({ trades, name }: { trades: Trade[]; name: string }) {
  return (
    <div className="export-buttons" role="group" aria-label="Exporter">
      <button
        type="button"
        className="secondary small"
        onClick={() => downloadCsv(trades, `r-ledger-${name}-${todayInBrussels()}.csv`)}
        title="Télécharger les trades sélectionnés en tableau (Excel)"
      >
        ⤓ CSV
      </button>
      <button
        type="button"
        className="secondary small"
        onClick={() => window.print()}
        title="Imprimer ou enregistrer la page en PDF (choisir « Enregistrer au format PDF »)"
      >
        ⎙ PDF
      </button>
    </div>
  )
}
