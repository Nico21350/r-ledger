import { NavLink, Outlet, useLocation } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useSync } from '../lib/queries'
import { FilterMenu } from './FilterMenu'

const NAV = [
  { to: '/', label: "Vue d'ensemble" },
  { to: '/analyses', label: 'Analyses' },
  { to: '/galerie', label: 'Galerie' },
]

// Cadre commun à tous les écrans : barre du haut, puis l'écran demandé (<Outlet />).
export function Layout({ email }: { email: string }) {
  const { search } = useLocation()
  const queryClient = useQueryClient()
  const sync = useSync()

  async function signOut() {
    await supabase.auth.signOut()
    // On vide le cache pour qu'aucune donnée ne reste en mémoire après la déconnexion.
    queryClient.clear()
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">R Ledger</span>
          <nav className="nav">
            {NAV.map((item) => (
              // `search` garde les filtres actifs quand on change d'écran.
              <NavLink key={item.to} to={{ pathname: item.to, search }} end={item.to === '/'}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="topbar-actions">
          <FilterMenu />
          <button onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? 'Synchronisation…' : 'Synchroniser'}
          </button>
          <button className="secondary" onClick={signOut} title={email}>
            Se déconnecter
          </button>
        </div>
      </header>

      <main className="page">
        {sync.data && (
          <p className="notice row">
            <span>
              Synchro terminée : {sync.data.added} ajoutés, {sync.data.updated} mis à jour, {sync.data.unchanged}{' '}
              inchangés, {sync.data.deleted} supprimés · {sync.data.imagesAdded} captures téléchargées,{' '}
              {sync.data.imagesDeleted} supprimées.
            </span>
            <button className="secondary" onClick={() => sync.reset()} aria-label="Fermer">
              ✕
            </button>
          </p>
        )}
        {sync.error && <p className="error">Synchro impossible : {sync.error.message}</p>}
        <Outlet />
      </main>
    </>
  )
}
