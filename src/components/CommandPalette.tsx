import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useFilters } from '../hooks/useFilters'
import { EMPTY_FILTERS } from '../lib/filters'
import { useTrades } from '../lib/queries'
import { normalize, searchTrades } from '../lib/search'
import { formatDate, formatR, rClass, type Trade } from '../lib/trades'

type Entry =
  | { kind: 'page' | 'action'; id: string; label: string; hint: string; run: () => void }
  | { kind: 'trade'; id: string; trade: Trade; run: () => void }

const GROUPS: Record<Entry['kind'], string> = { page: 'Écrans', action: 'Actions', trade: 'Trades' }

// Recherche rapide (Ctrl+K ou ⌘K) : écrans, actions et trades, au clavier.
// onSync absent (mode démo) : l'action « Synchroniser » n'est pas proposée.
export function CommandPalette({ open, onOpenChange, onSync }: { open: boolean; onOpenChange: (open: boolean) => void; onSync?: () => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const { search } = useLocation()
  const { setFilters } = useFilters()
  const { data: trades = [] } = useTrades()
  const listRef = useRef<HTMLUListElement>(null)

  // Raccourci global, valable sur tous les écrans.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  const close = () => {
    onOpenChange(false)
    setQuery('')
    setActive(0)
  }

  const entries = useMemo<Entry[]>(() => {
    const go = (pathname: string) => () => navigate({ pathname, search })
    const commands: Entry[] = [
      { kind: 'page', id: 'p-overview', label: "Vue d'ensemble", hint: 'Courbe des R et chiffres clés', run: go('/') },
      { kind: 'page', id: 'p-analyses', label: 'Analyses', hint: 'Croisements, calendrier, Monte-Carlo', run: go('/analyses') },
      { kind: 'page', id: 'p-galerie', label: 'Galerie', hint: 'Toutes les captures', run: go('/galerie') },
      { kind: 'page', id: 'p-comparer', label: 'Comparer deux trades', hint: 'Côte à côte', run: go('/comparer') },
      ...(onSync ? [{ kind: 'action' as const, id: 'a-sync', label: 'Synchroniser avec Notion', hint: 'Importe les nouveaux trades', run: onSync }] : []),
      { kind: 'action', id: 'a-reset', label: 'Retirer tous les filtres', hint: 'Revenir à tous les trades', run: () => setFilters(EMPTY_FILTERS) },
    ]
    const words = normalize(query).split(/\s+/).filter(Boolean)
    const matching = commands.filter((c) => c.kind !== 'trade' && words.every((w) => normalize(`${c.label} ${c.hint}`).includes(w)))
    const found: Entry[] = searchTrades(trades, query).map((t) => ({
      kind: 'trade',
      id: t.id,
      trade: t,
      run: () => navigate({ pathname: `/trade/${t.id}`, search }),
    }))
    // Sans recherche : les écrans, les actions et les 5 derniers trades.
    if (words.length === 0) {
      const recent: Entry[] = [...trades]
        .slice(-5)
        .reverse()
        .map((t) => ({ kind: 'trade', id: t.id, trade: t, run: () => navigate({ pathname: `/trade/${t.id}`, search }) }))
      return [...commands, ...recent]
    }
    return [...matching, ...found]
  }, [query, trades, navigate, search, onSync, setFilters])

  const current = Math.min(active, Math.max(0, entries.length - 1))

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${current}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [current])

  function onKeyDown(e: ReactKeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((current + 1) % Math.max(1, entries.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((current - 1 + entries.length) % Math.max(1, entries.length))
    } else if (e.key === 'Enter' && entries[current]) {
      e.preventDefault()
      entries[current].run()
      close()
    } else if (e.key === 'Escape') {
      close()
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="palette-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="Recherche rapide"
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="palette-input">
              <span aria-hidden="true">⌕</span>
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={onKeyDown}
                placeholder="Rechercher un trade (NQ, mardi, +2 R, NY-2…), un écran ou une action"
                aria-label="Rechercher"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={entries[current] ? `palette-${entries[current].id}` : undefined}
              />
              <kbd>Échap</kbd>
            </div>
            <ul className="palette-list" id="palette-list" role="listbox" ref={listRef}>
              {entries.length === 0 && <li className="palette-empty muted">Aucun résultat pour « {query} ».</li>}
              {entries.map((entry, i) => (
                <li key={entry.id} role="presentation">
                  {(i === 0 || entries[i - 1].kind !== entry.kind) && (
                    <span className="palette-group">{GROUPS[entry.kind]}</span>
                  )}
                  <button
                    type="button"
                    id={`palette-${entry.id}`}
                    role="option"
                    aria-selected={i === current}
                    data-index={i}
                    className={`palette-item${i === current ? ' active' : ''}`}
                    onPointerMove={() => setActive(i)}
                    onClick={() => {
                      entry.run()
                      close()
                    }}
                  >
                    {i === current && <motion.span layoutId="palette-pill" className="palette-pill" transition={{ type: 'spring', stiffness: 600, damping: 40 }} />}
                    {entry.kind === 'trade' ? (
                      <>
                        <span className="palette-main">
                          <strong>
                            {entry.trade.instrument ?? '—'} {entry.trade.direction ?? ''}
                          </strong>
                          <span className="muted">
                            {formatDate(entry.trade)}
                            {entry.trade.ny_hour && ` · ${entry.trade.ny_hour}`}
                          </span>
                        </span>
                        {entry.trade.rr_closed !== null && (
                          <span className={`r-badge ${rClass(entry.trade.rr_closed)}`}>{formatR(entry.trade.rr_closed)}</span>
                        )}
                      </>
                    ) : (
                      <span className="palette-main">
                        <strong>{entry.label}</strong>
                        <span className="muted">{entry.hint}</span>
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <footer className="palette-footer muted">
              <span>
                <kbd>↑</kbd> <kbd>↓</kbd> pour choisir
              </span>
              <span>
                <kbd>Entrée</kbd> pour ouvrir
              </span>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
