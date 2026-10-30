import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { INDICATOR_GROUPS, INDICATORS, type IndicatorId } from '../lib/indicators'
import { riseIn, stagger } from '../lib/motion'
import { computeOverview } from '../lib/stats'
import type { Trade } from '../lib/trades'
import type { OverviewState } from './Overview'
import { IndicatorTile } from './IndicatorTile'

// Les 14 indicateurs, par famille. « Voir sur la courbe » ramène à la vue d'ensemble, zoomée sur le bon passage.
export function IndicatorsPanel({ trades }: { trades: Trade[] }) {
  const stats = useMemo(() => computeOverview(trades), [trades])
  const navigate = useNavigate()
  const { search } = useLocation()
  const onCurve = (id: IndicatorId) => navigate({ pathname: '/', search }, { state: { focus: id } satisfies OverviewState })

  return (
    <motion.section className="panel" id="indicateurs" variants={riseIn}>
      <h3>Tous les indicateurs</h3>
      <p className="panel-lede">Les chiffres clés de la période, avec ce que chacun mesure.</p>
      {INDICATOR_GROUPS.map((group) => (
        <div key={group} className="indicator-group">
          <h4 className="section-title">{group}</h4>
          <motion.div className="mini-tiles" variants={stagger}>
            {INDICATORS.filter((i) => i.group === group).map((i) => (
              <IndicatorTile
                key={i.id}
                id={i.id}
                stats={stats}
                previous={null}
                onCurve={onCurve}
                onTrade={(p) => navigate({ pathname: `/trade/${p.trade.id}`, search })}
              />
            ))}
          </motion.div>
        </div>
      ))}
    </motion.section>
  )
}
