import { motion } from 'motion/react'
import { riseIn } from '../lib/motion'
import { AnimatedNumber } from './AnimatedNumber'
import { InfoTip } from './InfoTip'

type Props = {
  label: string
  value: number | null
  format: (v: number) => string
  info: string
  tone?: (v: number) => string
  // Comparaison avec la période précédente. higherIsBetter = null : ni mieux ni moins bien (ex. nombre de trades).
  previous?: number | null
  higherIsBetter?: boolean | null
  formatDelta?: (v: number) => string
  // Carte cliquable : action (ouvrir une fiche, zoomer la courbe) et son libellé.
  onClick?: () => void
  actionLabel?: string
  detail?: string
}

export function StatTile({
  label,
  value,
  format,
  info,
  tone,
  previous,
  higherIsBetter = true,
  formatDelta = format,
  onClick,
  actionLabel,
  detail,
}: Props) {
  return (
    <motion.div
      className={`tile${onClick ? ' clickable' : ''}`}
      variants={riseIn}
      whileHover={{ y: -4 }}
    >
      <span className="tile-label">
        {label}
        <InfoTip text={info} />
      </span>
      <strong className={value !== null && tone ? tone(value) : ''}>
        {value === null ? '—' : <AnimatedNumber value={value} format={format} />}
      </strong>
      {detail && <span className="tile-detail muted">{detail}</span>}
      <Delta value={value} previous={previous} higherIsBetter={higherIsBetter} format={formatDelta} />
      {/* Le bouton couvre toute la carte (voir .tile-action::after) : toute la carte est cliquable,
          sans mettre le « i » d'explication à l'intérieur d'un bouton. */}
      {onClick && actionLabel && (
        <button type="button" className="tile-action" onClick={onClick}>
          {actionLabel} →
        </button>
      )}
    </motion.div>
  )
}

export function Delta({
  value,
  previous,
  higherIsBetter,
  format,
}: {
  value: number | null
  previous: number | null | undefined
  higherIsBetter: boolean | null
  format: (v: number) => string
}) {
  if (previous === undefined) return null
  if (value === null || previous === null || !Number.isFinite(value) || !Number.isFinite(previous)) {
    return <span className="delta muted">— vs période précédente</span>
  }
  const diff = value - previous
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '='
  const better = higherIsBetter === null || diff === 0 ? '' : diff > 0 === higherIsBetter ? 'gain' : 'loss'
  return (
    <span className={`delta ${better}`} title={`Période précédente : ${format(previous)}`}>
      {arrow} {diff === 0 ? 'stable' : format(Math.abs(diff))}
      <span className="muted"> vs période préc.</span>
    </span>
  )
}
