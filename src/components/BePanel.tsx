import { useMemo } from 'react'
import { motion } from 'motion/react'
import { beEffect, groupByDimension } from '../lib/analysis'
import { DIMENSION_BY_KEY } from '../lib/dimensions'
import { riseIn, stagger } from '../lib/motion'
import { formatPercent, formatR, rClass, type Trade } from '../lib/trades'
import { InfoTip } from './InfoTip'
import { LowSample } from './LowSample'
import { StatTile } from './StatTile'
import type { DrawerContent } from './TradeDrawer'

// Libellés français des valeurs de la colonne « BE » de Notion.
const BE_LABELS: Record<string, string> = {
  'No BE setup': 'Pas de BE prévu',
  'No affect on result': 'Sans effet sur le résultat',
  'Prevented loss': 'Perte évitée',
  'Missed win': 'Gain manqué',
}

// Le stop remonté à BE (breakeven) : combien de R il a sauvés, combien il en a coûté.
export function BePanel({ trades, onOpen }: { trades: Trade[]; onOpen: (content: DrawerContent) => void }) {
  const effect = useMemo(() => beEffect(trades), [trades])
  const groups = useMemo(() => groupByDimension(trades, DIMENSION_BY_KEY.be), [trades])
  const net = effect.savedR - effect.missedR
  const total = trades.length

  return (
    <motion.section className="panel panel-fill" id="effet-be" variants={riseIn}>
      <div className="panel-header">
        <div>
          <h3>
            Effet du BE
            <InfoTip text="Une perte évitée compte pour 1 R sauvé (le stop initial aurait été touché). Un gain manqué compte pour son Achievable RR ; s'il n'est pas noté, on prend ton gain moyen de la période." />
          </h3>
          <p className="panel-lede">Ce que rapporte ou coûte le fait de remonter le stop au prix d'entrée (BE).</p>
          <p className="muted">
            Bilan :{' '}
            <strong className={rClass(net)}>
              {net === 0 ? 'neutre' : `${formatR(net)} ${net > 0 ? 'grâce au' : 'à cause du'} BE`}
            </strong>
          </p>
        </div>
      </div>

      <motion.div className="mini-tiles" variants={stagger}>
        <StatTile
          label="R sauvés"
          value={effect.savedR}
          format={(v) => formatR(v)}
          tone={rClass}
          detail={`${effect.prevented.length} perte${effect.prevented.length > 1 ? 's' : ''} évitée${effect.prevented.length > 1 ? 's' : ''}`}
          info="1 R par trade marqué « Prevented loss » : le stop initial aurait été touché."
          onClick={effect.prevented.length ? () => onOpen({ title: 'Pertes évitées par le BE', trades: effect.prevented }) : undefined}
          actionLabel="Voir les trades"
        />
        <StatTile
          label="R manqués"
          value={-effect.missedR}
          format={(v) => formatR(v)}
          tone={rClass}
          detail={
            effect.estimatedMissed > 0 && effect.averageWin !== null
              ? `${effect.missed.length} gain${effect.missed.length > 1 ? 's' : ''} manqué${effect.missed.length > 1 ? 's' : ''}, dont ${effect.estimatedMissed} estimé${effect.estimatedMissed > 1 ? 's' : ''} à ${formatR(effect.averageWin)}`
              : `${effect.missed.length} gain${effect.missed.length > 1 ? 's' : ''} manqué${effect.missed.length > 1 ? 's' : ''}`
          }
          info="Pour chaque trade marqué « Missed win » : l'Achievable RR, ou ton gain moyen s'il n'est pas noté."
          onClick={effect.missed.length ? () => onOpen({ title: 'Gains manqués à cause du BE', trades: effect.missed }) : undefined}
          actionLabel="Voir les trades"
        />
      </motion.div>

      <div className="be-rows">
        {groups.map((g, i) => {
          const share = total ? g.trades.length / total : 0
          const name = g.value ? (BE_LABELS[g.value] ?? g.value) : 'Non renseigné'
          return (
            <button
              key={g.value ?? 'none'}
              type="button"
              className="be-row"
              onClick={() => onOpen({ title: `BE : ${name}`, trades: g.trades })}
            >
              <span className="be-row-label">
                {name}
                {!g.reliable && <LowSample count={g.count} />}
              </span>
              <span className="be-bar">
                <motion.span
                  className={`be-bar-fill ${g.value === 'Prevented loss' ? 'gain' : g.value === 'Missed win' ? 'loss' : ''}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${share * 100}%` }}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
              <span className="muted">
                {g.trades.length} · {formatPercent(share)}
              </span>
              <strong className={rClass(g.totalR)}>{formatR(g.totalR, 1)}</strong>
            </button>
          )
        })}
      </div>
    </motion.section>
  )
}
