import { Link } from 'react-router'
import { usePageTitle } from '../hooks/useFilters'

export function NotFoundPage() {
  usePageTitle('Page introuvable')
  return (
    <div className="panel">
      <h2>Page introuvable</h2>
      <p className="muted">
        Cette adresse ne correspond à aucun écran. <Link to="/">Retour à la vue d'ensemble</Link>
      </p>
    </div>
  )
}
