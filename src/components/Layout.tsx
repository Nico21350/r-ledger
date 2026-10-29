import { Suspense, useCallback, useState } from 'react'
import { NavLink, useLocation, useOutlet } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useSync } from '../lib/queries'
import { ActiveFilters } from './ActiveFilters'
import { CommandPalette } from './CommandPalette'
import { FilterMenu } from './FilterMenu'
import { Skeleton } from './PageState'
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
  // Date affichée dans l'en-tête des exports PDF.
  const [today] = useState(() => new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' }))

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
      {/* Premier élément atteint avec Tab : permet de sauter la barre du haut au clavier. */}
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
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
          {/* Sur téléphone, les libellés (.label) sont masqués : seules les icônes restent, avec un aria-label. */}
          <button type="button" className="secondary search-trigger" onClick={() => setPaletteOpen(true)} aria-label="Rechercher">
            <span aria-hidden="true">⌕</span> <span className="label">Rechercher</span> <kbd>Ctrl K</kbd>
          </button>
          <FilterMenu />
          <button className="sync-button" onClick={runSync} disabled={sync.isPending} aria-label="Synchroniser avec Notion">
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
            <span className="label">{sync.isPending ? 'Synchronisation…' : 'Synchroniser'}</span>
          </button>
          <button className="secondary sign-out" onClick={signOut} title={email} aria-label="Se déconnecter">
            <span className="icon" aria-hidden="true">⏻</span>
            <span className="label">Se déconnecter</span>
          </button>
        </div>
      </header>

      <main className="page" id="contenu" tabIndex={-1}>
        {/* En-tête visible seulement à l'impression (export PDF). */}
        <p className="print-header">
          R Ledger · journal de trading en R · exporté le{' '}
          {today}
        </p>
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
            {/* Pendant le téléchargement d'un écran : les blocs animés de chargement. */}
            <Suspense fallback={<Skeleton />}>{outlet}</Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <Toasts items={toasts} onDismiss={dismiss} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onSync={runSync} />
    </>
  )
}
