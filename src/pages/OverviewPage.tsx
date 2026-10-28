import { useMemo } from 'react'
import { Overview } from '../components/Overview'
import { PageState } from '../components/PageState'
import { Segmented } from '../components/Segmented'
import { useFilteredTrades, useFilters, usePageTitle } from '../hooks/useFilters'
import { applyFilters, PERIOD_PRESETS, presetRange, previousRange, todayInBrussels, type PeriodPreset } from '../lib/filters'
import { computeOverview } from '../lib/stats'

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })

export function OverviewPage() {
  usePageTitle("Vue d'ensemble")
  const { trades, allTrades, isPending, error } = useFilteredTrades()
  const { filters, setFilters } = useFilters()
  const today = todayInBrussels()

  const stats = useMemo(() => computeOverview(trades), [trades])
  // Mêmes filtres, sur la période de même durée juste avant : sert aux flèches ▲▼ des cartes.
  const previousPeriod = previousRange(filters, today)
  const previous = previousPeriod ? computeOverview(applyFilters(allTrades, { ...filters, ...previousPeriod })) : null

  // Raccourci de période actif ; null si les dates ont été choisies à la main dans les filtres.
  const activePreset =
    PERIOD_PRESETS.find((p) => {
      const range = presetRange(p.value, today)
      return range.from === filters.from && range.to === filters.to
    })?.value ?? null

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Vue d'ensemble</h2>
          <p className="muted">
            {previousPeriod
              ? `Comparé à la période précédente : ${shortDate(previousPeriod.from)} → ${shortDate(previousPeriod.to)}`
              : 'Choisis une période pour comparer chaque chiffre avec la période précédente.'}
          </p>
        </div>
        <Segmented<PeriodPreset>
          id="overview-period"
          label="Période"
          options={PERIOD_PRESETS}
          value={activePreset}
          onChange={(preset) => setFilters({ ...filters, ...presetRange(preset, today) })}
        />
      </div>
      <PageState isPending={isPending} error={error} total={allTrades.length} filtered={trades.length}>
        <Overview stats={stats} previous={previous} />
      </PageState>
    </>
  )
}
