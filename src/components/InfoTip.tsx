import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Distance minimale entre la bulle et les bords de l'écran, et entre la bulle et le « i ».
const EDGE = 12
const GAP = 8

// Petit « i » qui affiche une explication au survol, au toucher ou au clavier (Tab).
// La bulle est placée sur la page entière (portail) : aucun cadre ne peut la couper,
// et sa position est calculée pour qu'elle reste toujours entièrement visible.
export function InfoTip({ text }: { text: string }) {
  const id = useId()
  const iconRef = useRef<HTMLSpanElement>(null)
  const bubbleRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)

  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const icon = iconRef.current?.getBoundingClientRect()
      const bubble = bubbleRef.current
      if (!icon || !bubble) return
      const width = bubble.offsetWidth
      const height = bubble.offsetHeight
      const viewport = document.documentElement.clientWidth
      // Centrée sur le « i », puis ramenée à l'intérieur de l'écran.
      const left = Math.min(Math.max(icon.left + icon.width / 2 - width / 2, EDGE), viewport - EDGE - width)
      // Au-dessus du « i », ou en dessous s'il n'y a pas la place.
      const below = icon.top - GAP - height < EDGE
      bubble.style.left = `${Math.max(EDGE, left)}px`
      bubble.style.top = `${below ? icon.bottom + GAP : icon.top - GAP - height}px`
      bubble.classList.toggle('below', below)
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  return (
    <span className="info-tip">
      <span
        ref={iconRef}
        className="info-tip-icon"
        tabIndex={0}
        role="button"
        aria-describedby={id}
        aria-label="Explication"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        i
      </span>
      {createPortal(
        <span ref={bubbleRef} className={`info-tip-text${open ? ' open' : ''}`} role="tooltip" id={id}>
          {text}
        </span>,
        document.body,
      )}
    </span>
  )
}
