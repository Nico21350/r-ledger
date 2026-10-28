import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

// Barre de zoom sous la courbe : deux poignées (début, fin) et la fenêtre entre les deux.
// La poignée reste « attrapée » même si la souris sort de la barre (setPointerCapture),
// et elle suit la souris en continu ; la valeur envoyée est arrondie au trade le plus proche.

type Part = 'start' | 'end' | 'window'
type Drag = { part: Part; pointerId: number; origin: number; from: { start: number; end: number }; pos: { start: number; end: number } }

export function RangeSlider({
  values,
  start,
  end,
  onChange,
  onReset,
  onDragChange,
  formatLabel,
}: {
  values: number[] // valeurs dessinées dans l'aperçu (R cumulés), une par point
  start: number
  end: number
  onChange: (start: number, end: number) => void
  onReset: () => void
  onDragChange?: (dragging: boolean) => void
  formatLabel: (index: number) => string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const max = values.length - 1

  // Position affichée : décimale pendant le glissement (mouvement fluide), entière sinon.
  const pos = drag?.pos ?? { start, end }
  const pct = (i: number) => (max > 0 ? (i / max) * 100 : 0)

  // Position de la souris convertie en numéro de point (décimal).
  const indexAt = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect()
    return Math.min(max, Math.max(0, ((clientX - rect.left) / rect.width) * max))
  }

  function emit(next: { start: number; end: number }) {
    const s = Math.round(next.start)
    const e = Math.round(next.end)
    if (s !== start || e !== end) onChange(s, e)
  }

  function onPointerDown(part: Part) {
    return (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return
      event.stopPropagation()
      event.preventDefault()
      trackRef.current!.setPointerCapture(event.pointerId)
      setDrag({ part, pointerId: event.pointerId, origin: indexAt(event.clientX), from: { start, end }, pos: { start, end } })
      onDragChange?.(true)
    }
  }

  // Clic sur la barre hors de la fenêtre : la fenêtre s'y centre, puis on peut la faire glisser.
  function onTrackPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const span = end - start
    const center = indexAt(event.clientX)
    const s = Math.min(max - span, Math.max(0, center - span / 2))
    const next = { start: s, end: s + span }
    emit(next)
    trackRef.current!.setPointerCapture(event.pointerId)
    setDrag({ part: 'window', pointerId: event.pointerId, origin: center, from: next, pos: next })
    onDragChange?.(true)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return
    const delta = indexAt(event.clientX) - drag.origin
    const { from } = drag
    let next: { start: number; end: number }
    if (drag.part === 'start') next = { start: Math.min(from.end - 1, Math.max(0, from.start + delta)), end: from.end }
    else if (drag.part === 'end') next = { start: from.start, end: Math.max(from.start + 1, Math.min(max, from.end + delta)) }
    else {
      const span = from.end - from.start
      const s = Math.min(max - span, Math.max(0, from.start + delta))
      next = { start: s, end: s + span }
    }
    setDrag({ ...drag, pos: next })
    emit(next)
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return
    emit(drag.pos)
    setDrag(null)
    onDragChange?.(false)
  }

  // Clavier : flèches = 1 trade, Page haut/bas = 5 trades, Début/Fin = au bout.
  function onKeyDown(part: Part) {
    return (event: KeyboardEvent<HTMLElement>) => {
      const steps: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -5, PageUp: 5, Home: -max, End: max }
      const step = steps[event.key]
      if (step === undefined) return
      event.preventDefault()
      if (part === 'start') onChange(Math.min(end - 1, Math.max(0, start + step)), end)
      else if (part === 'end') onChange(start, Math.max(start + 1, Math.min(max, end + step)))
      else {
        const span = end - start
        const s = Math.min(max - span, Math.max(0, start + step))
        onChange(s, s + span)
      }
    }
  }

  // Aperçu de la courbe complète, en SVG simple (0..max en largeur, 0..1 en hauteur).
  const low = Math.min(0, ...values)
  const high = Math.max(0, ...values)
  const y = (v: number) => (high === low ? 0.5 : 1 - (v - low) / (high - low))
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${i},${y(v)}`).join(' ')
  const area = `${line} L${max},1 L0,1 Z`

  if (max < 1) return null

  return (
    <div className="range-slider">
      <div
        ref={trackRef}
        className={`range-track${drag ? ' dragging' : ''}`}
        onPointerDown={onTrackPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onReset}
        title="Double-clic : toute la période"
      >
        <svg className="range-preview" viewBox={`0 0 ${max} 1`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="range-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--violet)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--electric)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#range-fill)" />
          <path d={line} fill="none" stroke="var(--muted)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="range-shade" style={{ left: 0, width: `${pct(pos.start)}%` }} />
        <div className="range-shade" style={{ left: `${pct(pos.end)}%`, right: 0 }} />
        <div
          className="range-window"
          style={{ left: `${pct(pos.start)}%`, width: `${pct(pos.end) - pct(pos.start)}%` }}
          role="slider"
          tabIndex={0}
          aria-label="Déplacer la fenêtre de zoom"
          aria-valuemin={0}
          aria-valuemax={max - (end - start)}
          aria-valuenow={start}
          aria-valuetext={`${formatLabel(start)} → ${formatLabel(end)}`}
          onPointerDown={onPointerDown('window')}
          onKeyDown={onKeyDown('window')}
        />
        <div
          className="range-handle"
          style={{ left: `${pct(pos.start)}%` }}
          role="slider"
          tabIndex={0}
          aria-label="Début du zoom"
          aria-valuemin={0}
          aria-valuemax={end - 1}
          aria-valuenow={start}
          aria-valuetext={formatLabel(start)}
          onPointerDown={onPointerDown('start')}
          onKeyDown={onKeyDown('start')}
        >
          <span className="range-handle-label">{formatLabel(Math.round(pos.start))}</span>
        </div>
        <div
          className="range-handle"
          style={{ left: `${pct(pos.end)}%` }}
          role="slider"
          tabIndex={0}
          aria-label="Fin du zoom"
          aria-valuemin={start + 1}
          aria-valuemax={max}
          aria-valuenow={end}
          aria-valuetext={formatLabel(end)}
          onPointerDown={onPointerDown('end')}
          onKeyDown={onKeyDown('end')}
        >
          <span className="range-handle-label">{formatLabel(Math.round(pos.end))}</span>
        </div>
      </div>
    </div>
  )
}
