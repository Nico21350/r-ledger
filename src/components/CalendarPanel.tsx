import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useFilters } from '../hooks/useFilters'
import { calendarDays, calendarWeeks, monthTotals, type CalendarDay } from '../lib/analysis'
import { todayInBrussels } from '../lib/filters'
import { riseIn } from '../lib/motion'
import { heatColor } from '../lib/theme'
import { brusselsDay, formatR, rClass, type Trade } from '../lib/trades'
import { InfoTip } from './InfoTip'
import type { DrawerContent } from './TradeDrawer'

const DAY_LABELS = ['Lun', '', 'Mer', '', 'Ven', '', 'Dim']

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const monthName = (month: string, style: 'short' | 'long') =>
  new Date(`${month}-15T12:00:00Z`).toLocaleDateString('fr-BE', { month: style, ...(style === 'long' && { year: 'numeric' }) })
const lastDayOfMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
}

// Calendrier façon GitHub : une colonne par semaine, un carré par jour, coloré selon les R du jour.
export function CalendarPanel({ trades, onOpen }: { trades: Trade[]; onOpen: (content: DrawerContent) => void }) {
  const { filters, setFilters } = useFilters()
  const [hovered, setHovered] = useState<{ day: string; data?: CalendarDay } | null>(null)
  const today = todayInBrussels()

  const days = useMemo(() => calendarDays(trades), [trades])
  const tradedDays = [...days.keys()].sort()
  // Période affichée : celle du filtre, sinon du premier trade à aujourd'hui.
  const from = filters.from ?? tradedDays[0] ?? today
  const to = filters.to ?? today
  const weeks = useMemo(() => calendarWeeks(from, to), [from, to])
  const months = monthTotals(days)

  const maxAbs = Math.max(0, ...[...days.values()].map((d) => Math.abs(d.totalR)))
  const green = [...days.values()].filter((d) => d.totalR > 0).length
  const red = [...days.values()].filter((d) => d.totalR < 0).length
  const bestDay = [...days.values()].reduce<CalendarDay | null>((a, b) => (!a || b.totalR > a.totalR ? b : a), null)

  // Nom du mois au-dessus de la première semaine qui contient le 1er du mois (et de la toute première semaine).
  const monthLabels = weeks.map((week, i) => {
    const first = week.find((d) => d.endsWith('-01'))
    if (i === 0) return monthName(week[6].slice(0, 7), 'short')
    return first && i > 1 ? monthName(first.slice(0, 7), 'short') : ''
  })

  return (
    <motion.section className="panel" id="calendrier" variants={riseIn}>
      <div className="panel-header">
        <div>
          <h3>
            Calendrier
            <InfoTip text="Un carré par jour : vert si la journée a rapporté des R, rouge si elle en a coûté, plus vif quand la valeur est grande. Clique sur un jour pour voir ses trades, ou sur un mois pour filtrer l'application sur ce mois." />
          </h3>
          <p className="muted" aria-live="polite">
            {hovered ? (
              <>
                {longDate(hovered.day)} :{' '}
                {hovered.data ? (
                  <>
                    {hovered.data.count} trade{hovered.data.count > 1 ? 's' : ''},{' '}
                    <span className={rClass(hovered.data.totalR)}>{formatR(hovered.data.totalR)}</span>
                  </>
                ) : (
                  'aucun trade'
                )}
              </>
            ) : (
              <>
                {days.size} jours tradés · <span className="gain">{green} verts</span> · <span className="loss">{red} rouges</span>
                {bestDay && (
                  <>
                    {' '}
                    · meilleur jour : {longDate(bestDay.day)} (<span className="gain">{formatR(bestDay.totalR)}</span>)
                  </>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar-scroll">
          <div className="calendar" style={{ gridTemplateColumns: `auto repeat(${weeks.length}, var(--cal-cell))` }}>
            <span />
            {monthLabels.map((m, i) => (
              <span key={`m-${weeks[i][0]}`} className="calendar-month">
                {m}
              </span>
            ))}
            {DAY_LABELS.map((label, row) => [
              <span key={`d-${row}`} className="calendar-day-label">
                {label}
              </span>,
              ...weeks.map((week, col) => {
                const day = week[row]
                if (day < from || day > to) return <span key={day} className="calendar-cell outside" />
                const data = days.get(day)
                return (
                  <motion.button
                    key={day}
                    type="button"
                    className={`calendar-cell${data ? ' traded' : ''}${day === today ? ' today' : ''}`}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1, backgroundColor: data ? heatColor(data.totalR, maxAbs) : 'rgb(19, 36, 74)' }}
                    whileHover={{ scale: 1.3, zIndex: 2, transition: { duration: 0.12 } }}
                    transition={{ delay: col * 0.012 + row * 0.01, duration: 0.3 }}
                    onPointerEnter={() => setHovered({ day, data })}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => setHovered({ day, data })}
                    onBlur={() => setHovered(null)}
                    onClick={() => data && onOpen({ title: longDate(day), trades: data.trades })}
                    disabled={!data}
                    aria-label={`${longDate(day)} : ${data ? `${data.count} trades, ${formatR(data.totalR)}` : 'aucun trade'}`}
                  />
                )
              }),
            ])}
          </div>
        </div>

        <div className="calendar-months">
          <span className="section-title">Par mois</span>
          {months.map((m, i) => {
            const range = { from: `${m.month}-01`, to: lastDayOfMonth(m.month) }
            const active = filters.from === range.from && filters.to === range.to
            return (
              <motion.button
                key={m.month}
                type="button"
                className={`month-row${active ? ' active' : ''}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                onClick={() => setFilters(active ? { ...filters, from: null, to: null } : { ...filters, ...range })}
                title={active ? 'Retirer le filtre sur ce mois' : 'Filtrer sur ce mois'}
              >
                <span>{monthName(m.month, 'long')}</span>
                <span className="muted">{m.count} tr.</span>
                <strong className={rClass(m.totalR)}>{formatR(m.totalR, 1)}</strong>
              </motion.button>
            )
          })}
          {trades.some((t) => !brusselsDay(t.traded_at)) && (
            <span className="muted small-note">Les trades sans date n'apparaissent pas dans le calendrier.</span>
          )}
        </div>
      </div>
    </motion.section>
  )
}
