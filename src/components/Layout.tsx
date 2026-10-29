import { useCallback, useState } from 'react'
import { NavLink, useLocation, useOutlet } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useSync } from '../lib/queries'
import { ActiveFilters } from './ActiveFilters'
import { CommandPalette } from './CommandPalette'
import { FilterMenu } from './FilterMenu'
import { Toasts, type ToastItem } from './Toasts'

const NAV = [
  { to: '/', label: "Vue d'ensemble" },
  { to: '/analyses', label: 'Analyses' },
  { to: '/galerie', label: 'Galerie' },
  { to: '/comparer', label: 'Comparer' },
]

// Cadre commun à tous les écrans : barre du haut, puis l'écran demandé, avec une transition entre écrans.
export function Layout({ email }: { email: string }) {
  const { pathname, search } = useLocation()
  // useOutlet (plutôt que <Outlet />) garde l'ancien écran affiché pendant son animation de sortie.
  const outlet = useOutlet()
  const queryClient = useQueryClient()
  const sync = useSync()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), [])
  const notify = (toast: Omit<ToastItem, 'id'>) => setToasts((ts) => [...ts, { ...toast, id: Date.now() }])

  function runSync() {
    sync.mutate(undefined, {
      onSuccess: (r) =>
        notify({
          kind: 'success',
          title: 'Synchro terminée',
          text: `${r.added} ajoutés · ${r.updated} mis à jour · ${r.deleted} supprimés · ${r.imagesAdded} captures téléchargées`,
        }),
      onError: (e) => notify({ kind: 'error', title: 'Synchro impossible', text: e.message }),
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    // On vide le cache pour qu'aucune donnée ne reste en mémoire après la déconnexion.
    queryClient.clear()
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">
            <span className="brand-mark" aria-hidden="true">R</span> Ledger
          </span>
          <nav className="nav">
            {NAV.map((item) => (
              // `search` garde les filtres actifs quand on change d'écran.
              <NavLink key={item.to} to={{ pathname: item.to, search }} end={item.to === '/'}>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="nav-pill"
                        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                      />
                    )}
                    <span className="nav-label">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="topbar-actions">
          <button type="button" className="secondary search-trigger" onClick={() => setPaletteOpen(true)}>
            <span aria-hidden="true">⌕</span> Rechercher <kbd>Ctrl K</kbd>
          </button>
          <FilterMenu />
          <button className="sync-button" onClick={runSync} disabled={sync.isPending}>
            <svg className={sync.isPending ? 'spin' : ''} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {sync.isPending ? 'Synchronisation…' : 'Synchroniser'}
          </button>
          <button className="secondary" onClick={signOut} title={email}>
            Se déconnecter
          </button>
        </div>
      </header>

      <main className="page">
        <ActiveFilters />
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            className="page-content"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>

      <Toasts items={toasts} onDismiss={dismiss} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onSync={runSync} />
    </>
  )
}
