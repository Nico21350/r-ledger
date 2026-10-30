import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DEFAULT_INDICATORS, INDICATOR_GROUPS, INDICATORS, MAX_INDICATORS, type IndicatorId } from '../lib/indicators'

// Bouton « Personnaliser » : choix des indicateurs de la vue d'ensemble, dans un menu comme celui des filtres.
export function IndicatorPicker({ value, onChange }: { value: IndicatorId[]; onChange: (next: IndicatorId[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fermeture par un clic en dehors du menu ou par la touche Échap.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const full = value.length >= MAX_INDICATORS
  // Ordre du catalogue ; au moins un indicateur reste choisi.
  const toggle = (id: IndicatorId) => {
    if (value.includes(id)) {
      if (value.length > 1) onChange(value.filter((v) => v !== id))
    } else if (!full) {
      onChange(INDICATORS.map((i) => i.id).filter((v) => v === id || value.includes(v)))
    }
  }

  return (
    <div className="filter-menu" ref={ref}>
      <button className="filter-trigger accent-trigger" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">✦</span> Personnaliser
        <span aria-hidden="true">▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="filter-panel"
            role="dialog"
            aria-label="Indicateurs affichés"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="muted picker-count">
              {value.length} / {MAX_INDICATORS} indicateurs choisis
              {full && ' : retire-en un pour en choisir un autre'}
            </p>
            {INDICATOR_GROUPS.map((group) => (
              <fieldset key={group} className="filter-section">
                <legend>{group}</legend>
                <div className="chips">
                  {INDICATORS.filter((i) => i.group === group).map((i) => {
                    const active = value.includes(i.id)
                    return (
                      <button
                        key={i.id}
                        type="button"
                        className={`chip${active ? ' active' : ''}`}
                        aria-pressed={active}
                        disabled={!active && full}
                        title={!active && full ? `${MAX_INDICATORS} au plus : retire d'abord un indicateur` : i.hint}
                        onClick={() => toggle(i.id)}
                      >
                        {i.label}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            ))}
            <div className="filter-footer">
              <button type="button" className="secondary" onClick={() => onChange(DEFAULT_INDICATORS)}>
                Choix par défaut
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
