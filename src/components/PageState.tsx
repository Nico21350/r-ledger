import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

// États communs à tous les écrans : chargement, erreur, aucun trade, aucun trade après filtres.
export function PageState({
  isPending,
  error,
  total,
  filtered,
  children,
}: {
  isPending: boolean
  error: Error | null
  total: number
  filtered: number
  children: ReactNode
}) {
  const { pathname } = useLocation()

  if (isPending) return <Skeleton />
  if (error) return <p className="error">Impossible de charger les trades : {error.message}</p>
  if (total === 0) return <p className="muted">Aucun trade pour l'instant. Clique sur « Synchroniser » pour importer Notion.</p>
  if (filtered === 0) {
    return (
      <p className="muted">
        Aucun trade ne correspond aux filtres. <Link to={pathname}>Retirer les filtres</Link>
      </p>
    )
  }
  return children
}

// Blocs gris animés qui dessinent la page pendant le chargement.
export function Skeleton() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Chargement des trades">
      <div className="skeleton hero-skeleton" />
      <div className="tiles">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton tile-skeleton" />
        ))}
      </div>
      <div className="skeleton chart-skeleton" />
    </div>
  )
}
