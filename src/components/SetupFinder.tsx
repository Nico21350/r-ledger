import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { useFilters } from '../hooks/useFilters'
import { groupByDimension, MIN_SAMPLE, summarize } from '../lib/analysis'
import { DIMENSION_BY_KEY, DIMENSIONS, type DimensionKey } from '../lib/dimensions'
import { withDimension } from '../lib/filters'
import { riseIn, stagger } from '../lib/motion'
import { matchesSetup, rankSetups, type RankedSetup, type Setup } from '../lib/setups'
import { themeColors } from '../lib/theme'
import { formatNumber, formatPercent, formatR, rClass, type Trade } from '../lib/trades'
import { InfoTip } from './InfoTip'
import { LowSample } from './LowSample'
import { StatTile } from './StatTile'
import type { DrawerContent } from './TradeDrawer'

const rGap = (v: number) => `${v.toLocaleString('fr-BE', { maximumFractionDigits: 2 })} R`
const pointsGap = (v: number) => `${Math.round(v * 100)} pts`

// Nom du critère devant sa valeur (« Session NY-2 »), sauf pour BUY / SELL où la valeur suffit.
const criterionLabel = (key: DimensionKey) => (key === 'sens' ? '' : DIMENSION_BY_KEY[key].label)

// « Session NY-2 + HTF range H1 »
function describe(setup: Setup): string {
  return (Object.entries(setup) as [DimensionKey, string][]).map(([k, v]) => `${criterionLabel(k)} ${v}`.trim()).join(' + ')
}

// Combine des critères et vois tout de suite ce que vaut la combinaison ; classement automatique en dessous.
export function SetupFinder({ trades, onOpen }: { trades: Trade[]; onOpen: (content: DrawerContent) => void }) {
  const { filters, setFilters } = useFilters()
  const [setup, setSetup] = useState<Setup>({})
  const c = themeColors()

  const matching = useMemo(() => trades.filter((t) => matchesSetup(t, setup)), [trades, setup])
  const summary = summarize(matching)
  const all = summarize(trades)
  const criteria = Object.keys(setup).length
  const ranked = useMemo(() => rankSetups(trades), [trades])
  const best = ranked.slice(0, 5)
  const worst = ranked.slice(-5).reverse().filter((r) => !best.includes(r) && (r.avgR ?? 0) < (all.avgR ?? 0))

  // Valeurs proposées pour chaque critère : celles encore possibles avec les autres critères choisis.
  const options = (key: DimensionKey) => {
    const others: Setup = { ...setup }
    delete others[key]
    return groupByDimension(
      trades.filter((t) => matchesSetup(t, others)),
      DIMENSION_BY_KEY[key],
    ).filter((g) => g.value !== null)
  }

  const curve = matching
    .filter((t) => t.rr_closed !== null)
    .reduce<{ cumR: number }[]>((acc, t) => [...acc, { cumR: (acc.at(-1)?.cumR ?? 0) + t.rr_closed! }], [{ cumR: 0 }])

  function update(key: DimensionKey, value: string) {
    setSetup((s) => {
      const next = { ...s }
      if (value) next[key] = value
      else delete next[key]
      return next
    })
  }

  function applyAsFilter() {
    const next = (Object.entries(setup) as [DimensionKey, string][]).reduce((f, [k, v]) => withDimension(f, k, v), filters)
    setFilters(next)
    setSetup({})
  }

  return (
    <motion.section className="panel" id="setups" variants={riseIn}>
      <div className="panel-header">
        <div>
          <h3>
            Chercheur de setups
            <InfoTip text="Choisis un ou plusieurs critères : les chiffres montrent ce que vaut la combinaison, comparée à tous tes trades. Le classement en dessous teste toutes les combinaisons d'un ou deux critères qui réunissent au moins 5 trades." />
          </h3>
          <p className="muted">
            {criteria === 0
              ? 'Choisis des critères pour composer un setup.'
              : `${describe(setup)} : ${matching.length} trade${matching.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="toolbar">
          <button type="button" className="secondary small" disabled={criteria === 0} onClick={() => setSetup({})}>
            Effacer
          </button>
          <button
            type="button"
            className="secondary small"
            disabled={criteria === 0 || matching.length === 0}
            onClick={() => onOpen({ title: describe(setup), trades: matching })}
          >
            Voir les trades
          </button>
          <button type="button" className="small" disabled={criteria === 0} onClick={applyAsFilter}>
            Appliquer comme filtre
          </button>
        </div>
      </div>

      <div className="setup-builder">
        {DIMENSIONS.filter((d) => d.key !== 'pris').map((d) => {
          const chosen = setup[d.key]
          return (
            <label key={d.key} className={`setup-field${chosen ? ' active' : ''}`}>
              <span>{d.label}</span>
              <select value={chosen ?? ''} onChange={(e) => update(d.key, e.target.value)}>
                <option value="">Tous</option>
                {options(d.key).map((g) => (
                  <option key={g.value} value={g.value!}>
                    {g.value} ({g.count})
                  </option>
                ))}
              </select>
            </label>
          )
        })}
      </div>

      <div className="setup-result">
        <motion.div className="mini-tiles setup-tiles" variants={stagger}>
          <StatTile
            label="Trades"
            value={summary.count}
            format={(v) => String(Math.round(v))}
            info="Trades qui remplissent tous les critères choisis."
            detail={criteria && !summary.reliable ? 'Moins de 5 trades : peu fiable' : undefined}
          />
          <StatTile
            label="Espérance"
            value={summary.avgR}
            format={formatR}
            tone={rClass}
            previous={criteria ? all.avgR : undefined}
            formatDelta={rGap}
            info="R moyen par trade de la combinaison. La flèche compare à l'ensemble de tes trades."
          />
          <StatTile
            label="Win rate"
            value={summary.winRate}
            format={formatPercent}
            previous={criteria ? all.winRate : undefined}
            formatDelta={pointsGap}
            info="Part des trades gagnants de la combinaison."
          />
          <StatTile
            label="Total"
            value={summary.totalR}
            format={formatR}
            tone={rClass}
            info="Somme des R de la combinaison."
          />
          <StatTile
            label="Profit factor"
            value={summary.profitFactor}
            format={(v) => formatNumber(v)}
            tone={(v) => (v >= 1 ? 'gain' : 'loss')}
            info="R gagnés ÷ R perdus de la combinaison."
          />
        </motion.div>
        <div className="setup-spark" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve} margin={{ top: 6, right: 4, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id="setup-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.violet} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={c.electric} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="cumR" stroke={c.violet} strokeWidth={2} fill="url(#setup-fill)" dot={false} animationDuration={600} />
            </AreaChart>
          </ResponsiveContainer>
          <span className="muted">Courbe des R cumulés de la combinaison</span>
        </div>
      </div>

      <div className="setup-rankings">
        <Ranking title="Meilleures combinaisons" items={best} onPick={setSetup} current={setup} />
        <Ranking title="Moins bonnes combinaisons" items={worst} onPick={setSetup} current={setup} />
      </div>
      {ranked.length === 0 && (
        <p className="muted">Aucune combinaison ne réunit encore {MIN_SAMPLE} trades avec les filtres actuels.</p>
      )}
    </motion.section>
  )
}

function Ranking({
  title,
  items,
  onPick,
  current,
}: {
  title: string
  items: RankedSetup[]
  onPick: (setup: Setup) => void
  current: Setup
}) {
  const currentKey = JSON.stringify(current)
  return (
    <div className="ranking">
      <span className="section-title">{title}</span>
      <AnimatePresence initial={false} mode="popLayout">
        {items.length === 0 && (
          <motion.p key="empty" className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Rien à signaler.
          </motion.p>
        )}
        {items.map((r, i) => (
          <motion.button
            key={JSON.stringify(r.setup)}
            layout
            type="button"
            className={`ranking-row${JSON.stringify(r.setup) === currentKey ? ' active' : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onPick(r.setup)}
            title="Charger cette combinaison dans le chercheur"
          >
            <span className="ranking-rank">{i + 1}</span>
            <span className="ranking-setup">
              {(Object.entries(r.setup) as [DimensionKey, string][]).map(([k, v]) => (
                <span key={k} className="criterion">
                  {criterionLabel(k) && <span className="muted">{criterionLabel(k)}</span>} {v}
                </span>
              ))}
              {!r.reliable && <LowSample count={r.count} />}
            </span>
            <span className="muted">{r.count} tr.</span>
            <strong className={r.avgR === null ? '' : rClass(r.avgR)}>{r.avgR === null ? '—' : formatR(r.avgR)}</strong>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
