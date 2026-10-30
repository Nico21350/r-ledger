import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { useFilters } from '../hooks/useFilters'
import type { DimensionKey } from '../lib/dimensions'
import { withDimension } from '../lib/filters'
import { computeInsights, type Insight } from '../lib/insights'
import { riseIn, stagger } from '../lib/motion'
import type { Trade } from '../lib/trades'
import { InfoTip } from './InfoTip'

const ICONS: Record<Insight['tone'], string> = { gain: '▲', loss: '▼', neutral: '◆' }

// Constats rédigés automatiquement ; un clic filtre sur le constat ou ouvre la bonne section des Analyses.
// compact : une seule ligne (point fort et point faible) et un lien vers tous les constats.
export function InsightsPanel({ trades, compact = false }: { trades: Trade[]; compact?: boolean }) {
  const insights = useMemo(() => computeInsights(trades), [trades])
  const { filters, setFilters } = useFilters()
  const navigate = useNavigate()
  const { search } = useLocation()

  if (insights.length === 0) return null

  function open(insight: Insight) {
    if (insight.filter) {
      const next = (Object.entries(insight.filter) as [DimensionKey, string][]).reduce((f, [k, v]) => withDimension(f, k, v), filters)
      setFilters(next)
    } else if (insight.section) {
      navigate({ pathname: '/analyses', search, hash: insight.section })
    }
  }

  if (compact) {
    const pair = insights.filter((i) => i.short)
    return (
      <motion.section className="insight-strip" variants={riseIn} aria-label="Constats">
        {pair.map((insight) => (
          <button key={insight.id} type="button" className={`insight compact ${insight.tone}`} onClick={() => open(insight)}>
            <span className="insight-icon" aria-hidden="true">
              {ICONS[insight.tone]}
            </span>
            <span>
              <strong>{insight.id === 'best' ? 'Point fort' : 'Point faible'}</strong> : {insight.short}
            </span>
          </button>
        ))}
        <Link className="see-all" to={{ pathname: '/analyses', search, hash: 'constats' }}>
          Voir tous les constats →
        </Link>
      </motion.section>
    )
  }

  return (
    <section className="insights" id="constats">
      <motion.h3 className="section-title" variants={riseIn}>
        Constats
        <InfoTip text="Rédigés automatiquement à partir des trades sélectionnés. Seuls les groupes d'au moins 5 trades sont pris en compte. Clique sur un constat pour filtrer sur lui ou voir le détail." />
      </motion.h3>
      <motion.p className="panel-lede" variants={riseIn}>
        Ce que disent les chiffres, en une phrase chacun.
      </motion.p>
      <motion.div className="insight-list" variants={stagger}>
        {insights.map((insight) => (
          <motion.button
            key={insight.id}
            type="button"
            className={`insight ${insight.tone}`}
            variants={riseIn}
            whileHover={{ y: -3 }}
            title={insight.filter ? 'Filtrer sur ce constat' : 'Voir le détail dans les Analyses'}
            onClick={() => open(insight)}
          >
            <span className="insight-icon" aria-hidden="true">
              {ICONS[insight.tone]}
            </span>
            <span className="insight-body">
              <strong>{insight.title}</strong>
              <span>{insight.text}</span>
            </span>
          </motion.button>
        ))}
      </motion.div>
    </section>
  )
}
