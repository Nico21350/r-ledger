import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  applyFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  PERIOD_PRESETS,
  presetRange,
  SESSION_ORDER,
  todayInBrussels,
  type Filters,
} from '../lib/filters'
import { useTrades } from '../lib/queries'
import { useFilters } from '../hooks/useFilters'

// Filtre global en menu déroulant : un seul bouton dans la barre du haut.
export function FilterMenu() {
  const { filters, setFilters } = useFilters()
  const { data: trades = [] } = useTrades()
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

  // Les choix proposés viennent des trades eux-mêmes.
  const instruments = useMemo(
    () => [...new Set(trades.map((t) => t.instrument).filter((v): v is string => !!v))].sort(),
    [trades],
  )
  const sessions = useMemo(() => {
    const present = new Set(trades.map((t) => t.ny_hour).filter((v): v is string => !!v))
    return [...SESSION_ORDER.filter((s) => present.has(s)), ...[...present].filter((s) => !SESSION_ORDER.includes(s))]
  }, [trades])

  const active = countActiveFilters(filters)
  const matching = applyFilters(trades, filters).length
  const today = todayInBrussels()

  const update = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch })
  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  return (
    <div className="filter-menu" ref={ref}>
      <button
        className="secondary filter-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        Filtres
        {active > 0 && <span className="badge">{active}</span>}
        <span aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="filter-panel" role="dialog" aria-label="Filtres">
          <Section title="Période">
            <div className="chips">
              {PERIOD_PRESETS.map((p) => {
                const range = presetRange(p.value, today)
                return (
                  <Chip
                    key={p.value}
                    active={range.from === filters.from && range.to === filters.to}
                    onClick={() => update(range)}
                  >
                    {p.label}
                  </Chip>
                )
              })}
            </div>
            <div className="dates">
              <label>
                Du
                <input
                  type="date"
                  value={filters.from ?? ''}
                  max={filters.to ?? undefined}
                  onChange={(e) => update({ from: e.target.value || null })}
                />
              </label>
              <label>
                Au
                <input
                  type="date"
                  value={filters.to ?? ''}
                  min={filters.from ?? undefined}
                  onChange={(e) => update({ to: e.target.value || null })}
                />
              </label>
            </div>
          </Section>

          <Section title="Instrument">
            <div className="chips">
              {instruments.map((i) => (
                <Chip
                  key={i}
                  active={filters.instruments.includes(i)}
                  onClick={() => update({ instruments: toggle(filters.instruments, i) })}
                >
                  {i}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Session">
            <div className="chips">
              {sessions.map((s) => (
                <Chip
                  key={s}
                  active={filters.sessions.includes(s)}
                  onClick={() => update({ sessions: toggle(filters.sessions, s) })}
                >
                  {s}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Sens">
            <div className="chips">
              <Chip active={filters.direction === null} onClick={() => update({ direction: null })}>
                Tous
              </Chip>
              <Chip active={filters.direction === 'BUY'} onClick={() => update({ direction: 'BUY' })}>
                BUY
              </Chip>
              <Chip active={filters.direction === 'SELL'} onClick={() => update({ direction: 'SELL' })}>
                SELL
              </Chip>
            </div>
          </Section>

          <Section title="Trades">
            <div className="chips">
              <Chip active={filters.taken === null} onClick={() => update({ taken: null })}>
                Tous
              </Chip>
              <Chip active={filters.taken === 'pris'} onClick={() => update({ taken: 'pris' })}>
                Pris
              </Chip>
              <Chip active={filters.taken === 'non-pris'} onClick={() => update({ taken: 'non-pris' })}>
                Non pris
              </Chip>
            </div>
          </Section>

          <footer className="row filter-footer">
            <span className="muted">
              {matching} trade{matching > 1 ? 's' : ''} sur {trades.length}
            </span>
            <button className="secondary" disabled={active === 0} onClick={() => setFilters(EMPTY_FILTERS)}>
              Réinitialiser
            </button>
          </footer>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="filter-section">
      <legend>{title}</legend>
      {children}
    </fieldset>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`chip${active ? ' active' : ''}`} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  )
}
