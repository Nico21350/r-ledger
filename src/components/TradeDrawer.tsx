import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { summarize } from '../lib/analysis'
import { formatDate, formatPercent, formatR, rClass, type Trade } from '../lib/trades'

export type DrawerContent = { title: string; trades: Trade[] }

// Panneau qui glisse depuis la droite avec la liste des trades d'une case, d'un jour ou d'une colonne.
export function TradeDrawer({ content, onClose }: { content: DrawerContent | null; onClose: () => void }) {
  const { search } = useLocation()

  useEffect(() => {
    if (!content) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [content, onClose])

  const summary = content ? summarize(content.trades) : null

  // Rendu directement dans <body> : la position « fixe » ne dépend ainsi d'aucune animation de la page.
  return createPortal(
    <AnimatePresence>
      {content && summary && (
        <>
          <motion.div
            key="backdrop"
            className="drawer-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            key="drawer"
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={content.title}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%', transition: { duration: 0.22, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          >
            <header className="drawer-header">
              <div>
                <h3>{content.title}</h3>
                <p className="muted">
                  {summary.count} trade{summary.count > 1 ? 's' : ''} ·{' '}
                  <span className={rClass(summary.totalR)}>{formatR(summary.totalR)}</span>
                  {summary.winRate !== null && ` · ${formatPercent(summary.winRate)} gagnants`}
                </p>
              </div>
              <button type="button" className="secondary small" onClick={onClose} autoFocus>
                Fermer
              </button>
            </header>
            <motion.ul
              className="drawer-list"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035, delayChildren: 0.1 } } }}
            >
              {content.trades.map((t) => (
                <motion.li
                  key={t.id}
                  variants={{ hidden: { opacity: 0, x: 16 }, show: { opacity: 1, x: 0 } }}
                >
                  <Link to={{ pathname: `/trade/${t.id}`, search }} className="drawer-trade">
                    <span>
                      <strong>
                        {t.instrument ?? '—'} {t.direction ?? ''}
                      </strong>
                      <span className="muted">
                        {formatDate(t)}
                        {t.ny_hour && ` · ${t.ny_hour}`}
                        {!t.taken && ' · non pris'}
                      </span>
                    </span>
                    <strong className={t.rr_closed === null ? 'muted' : rClass(t.rr_closed)}>
                      {t.rr_closed === null ? '—' : formatR(t.rr_closed)}
                    </strong>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
