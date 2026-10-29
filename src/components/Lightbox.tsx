import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import type { Capture } from '../lib/queries'
import { formatDate, formatR, rClass, type Trade } from '../lib/trades'

export type LightboxItem = { capture: Capture; trade: Trade }

// Capture en plein écran : flèches ← → (souris ou clavier), Échap pour fermer, clic pour zoomer.
export function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: LightboxItem[]
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const { search } = useLocation()
  const [zoomed, setZoomed] = useState(false)
  const [direction, setDirection] = useState(0)
  const thumbsRef = useRef<HTMLDivElement>(null)
  const open = index !== null && items[index] !== undefined
  const item = open ? items[index] : null

  function go(step: number) {
    if (index === null || items.length < 2) return
    setDirection(step)
    setZoomed(false)
    onIndexChange((index + step + items.length) % items.length)
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === ' ') {
        e.preventDefault()
        setZoomed((z) => !z)
      } else return
      e.stopPropagation()
    }
    // Phase de capture : la lightbox passe avant les raccourcis de la page (flèches de la fiche trade).
    document.addEventListener('keydown', onKeyDown, true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = ''
    }
  })

  // La miniature de la capture affichée reste visible dans la bande du bas.
  useEffect(() => {
    thumbsRef.current
      ?.querySelector('.lightbox-thumb.active')
      ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [index])

  return createPortal(
    <AnimatePresence>
      {item && index !== null && (
        <motion.div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Capture en plein écran"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <header className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <div>
              <strong>
                {item.trade.instrument ?? '—'} {item.trade.direction ?? ''}
              </strong>{' '}
              {item.trade.rr_closed !== null && (
                <span className={`r-badge ${rClass(item.trade.rr_closed)}`}>{formatR(item.trade.rr_closed)}</span>
              )}
              <span className="muted"> · {formatDate(item.trade)}</span>
            </div>
            <div className="toolbar">
              <span className="muted">
                {index + 1} / {items.length}
              </span>
              <Link className="button secondary small" to={{ pathname: `/trade/${item.trade.id}`, search }} onClick={onClose}>
                Fiche du trade
              </Link>
              <button type="button" className="secondary small" onClick={onClose} autoFocus>
                Fermer (Échap)
              </button>
            </div>
          </header>

          <div className="lightbox-stage">
            {items.length > 1 && (
              <button
                type="button"
                className="lightbox-arrow left"
                aria-label="Capture précédente"
                onClick={(e) => {
                  e.stopPropagation()
                  go(-1)
                }}
              >
                ‹
              </button>
            )}
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.img
                key={item.capture.id}
                src={item.capture.url}
                alt={`Capture du trade ${item.trade.instrument ?? ''} du ${formatDate(item.trade)}`}
                className={`lightbox-image${zoomed ? ' zoomed' : ''}`}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 80, scale: 0.96 }),
                  center: { opacity: 1, x: 0, scale: 1 },
                  exit: (d: number) => ({ opacity: 0, x: d * -80, scale: 0.96 }),
                }}
                initial="enter"
                animate={zoomed ? { opacity: 1, x: 0, scale: 2 } : 'center'}
                exit="exit"
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                drag={zoomed}
                dragMomentum={false}
                onClick={(e) => {
                  e.stopPropagation()
                  setZoomed((z) => !z)
                }}
                draggable={false}
              />
            </AnimatePresence>
            {items.length > 1 && (
              <button
                type="button"
                className="lightbox-arrow right"
                aria-label="Capture suivante"
                onClick={(e) => {
                  e.stopPropagation()
                  go(1)
                }}
              >
                ›
              </button>
            )}
          </div>

          {items.length > 1 && (
            <div className="lightbox-thumbs" ref={thumbsRef} onClick={(e) => e.stopPropagation()}>
              {items.map((it, i) => (
                <button
                  key={it.capture.id}
                  type="button"
                  className={`lightbox-thumb${i === index ? ' active' : ''}`}
                  aria-label={`Capture ${i + 1}`}
                  onClick={() => {
                    setDirection(i > index ? 1 : -1)
                    setZoomed(false)
                    onIndexChange(i)
                  }}
                >
                  <img src={it.capture.url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <p className="lightbox-hint">← → pour naviguer · clic ou Espace pour zoomer · glisser pour se déplacer</p>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
