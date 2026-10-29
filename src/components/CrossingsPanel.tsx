import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFilters } from '../hooks/useFilters'
import { groupByDimension, type Group } from '../lib/analysis'
import { DIMENSION_BY_KEY, DIMENSIONS, type DimensionKey } from '../lib/dimensions'
import { hasDimension, withDimension, withoutDimension } from '../lib/filters'
import { riseIn } from '../lib/motion'
import { themeColors } from '../lib/theme'
import { formatNumber, formatPercent, formatR, rClass, type Trade } from '../lib/trades'
import { InfoTip } from './InfoTip'
import { LowSample } from './LowSample'
import { Segmented } from './Segmented'
import type { DrawerContent } from './TradeDrawer'

type Metric = 'totalR' | 'avgR' | 'winRate'

const METRICS: { value: Metric; label: string }[] = [
  { value: 'totalR', label: 'Total R' },
  { value: 'avgR', label: 'Espérance' },
  { value: 'winRate', label: 'Win rate' },
]

type SortKey = 'value' | 'count' | 'winRate' | 'avgR' | 'totalR' | 'profitFactor'

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'value', label: 'Valeur' },
  { key: 'count', label: 'Trades' },
  { key: 'winRate', label: 'Win rate' },
  { key: 'avgR', label: 'Espérance' },
  { key: 'totalR', label: 'Total R' },
  { key: 'profitFactor', label: 'Profit factor' },
]

const NONE = 'Non renseigné'
const label = (g: Group) => g.value ?? NONE
const metricValue = (g: Group, metric: Metric) => g[metric] ?? 0
const formatMetric = (v: number, metric: Metric) => (metric === 'winRate' ? formatPercent(v) : formatR(v))

// Croisement d'une colonne Notion avec les résultats : graphique cliquable + tableau triable.
export function CrossingsPanel({ trades, onOpen }: { trades: Trade[]; onOpen: (content: DrawerContent) => void }) {
  const { filters, setFilters } = useFilters()
  const [dimKey, setDimKey] = useState<DimensionKey>('session')
  const [metric, setMetric] = useState<Metric>('totalR')
  // Ordre du tableau ; null = ordre naturel de la colonne (sessions dans l'ordre de la journée…).
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean } | null>(null)
  const c = themeColors()

  const dim = DIMENSION_BY_KEY[dimKey]
  const groups = useMemo(() => groupByDimension(trades, dim), [trades, dim])

  const rows = useMemo(() => {
    if (!sort) return groups
    const get = (g: Group) => (sort.key === 'value' ? label(g) : (g[sort.key] ?? -Infinity))
    return [...groups].sort((a, b) => {
      const [x, y] = [get(a), get(b)]
      const diff = typeof x === 'string' ? x.localeCompare(String(y), 'fr', { numeric: true }) : x - (y as number)
      return sort.desc ? -diff : diff
    })
  }, [groups, sort])

  // Phrase de synthèse : meilleure et pire valeur, parmi les groupes assez grands si possible.
  const ranked = groups.filter((g) => g.value !== null && g.count > 0)
  const pool = ranked.some((g) => g.reliable) ? ranked.filter((g) => g.reliable) : ranked
  const best = pool.length > 1 ? pool.reduce((a, b) => (metricValue(b, metric) > metricValue(a, metric) ? b : a)) : null
  const worst = pool.length > 1 ? pool.reduce((a, b) => (metricValue(b, metric) < metricValue(a, metric) ? b : a)) : null

  function toggleFilter(g: Group) {
    if (g.value === null) return
    setFilters(hasDimension(filters, dimKey, g.value) ? withoutDimension(filters, dimKey) : withDimension(filters, dimKey, g.value))
  }

  function sortBy(key: SortKey) {
    setSort((s) => (s?.key !== key ? { key, desc: key !== 'value' } : s.desc ? { key, desc: false } : null))
  }

  const chartData = groups.map((g) => ({ ...g, name: label(g), metricValue: metricValue(g, metric) }))
  // Largeur réservée aux noms à gauche des barres : juste ce qu'il faut pour le plus long (≈ 7 px par lettre).
  const labelWidth = Math.min(150, Math.max(40, ...chartData.map((g) => g.name.length * 7 + 12)))
  const barColor = (g: Group) => {
    if (metric === 'winRate') return c.electric
    const v = metricValue(g, metric)
    return v > 0 ? c.gain : v < 0 ? c.loss : c.muted
  }

  return (
    <motion.section className="panel" id="croisements" variants={riseIn}>
      <div className="panel-header">
        <div>
          <h3>
            Croisements
            <InfoTip text="Tes résultats découpés selon une colonne de Notion. Clique sur une barre pour filtrer toute l'application sur cette valeur (clique à nouveau pour retirer le filtre). Clique sur une ligne du tableau pour voir ses trades." />
          </h3>
          {best && worst && best !== worst ? (
            <p className="muted">
              Meilleur : <strong>{label(best)}</strong>{' '}
              <span className={metric === 'winRate' ? '' : rClass(metricValue(best, metric))}>
                {formatMetric(metricValue(best, metric), metric)}
              </span>{' '}
              ({best.count} trades) · Moins bon : <strong>{label(worst)}</strong>{' '}
              <span className={metric === 'winRate' ? '' : rClass(metricValue(worst, metric))}>
                {formatMetric(metricValue(worst, metric), metric)}
              </span>{' '}
              ({worst.count} trades)
            </p>
          ) : (
            <p className="muted">Une seule valeur pour cette colonne avec les filtres actuels.</p>
          )}
        </div>
        <Segmented id="crossing-metric" label="Statistique" options={METRICS} value={metric} onChange={setMetric} />
      </div>

      <div className="dim-chips" role="radiogroup" aria-label="Colonne à croiser">
        {DIMENSIONS.map((d) => {
          const selected = d.key === dimKey
          return (
            <button
              key={d.key}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`dim-chip${selected ? ' active' : ''}`}
              onClick={() => {
                setDimKey(d.key)
                setSort(null)
              }}
            >
              {selected && (
                <motion.span layoutId="dim-chip-pill" className="dim-chip-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
              )}
              <span className="segmented-label">{d.label}</span>
            </button>
          )
        })}
      </div>

      <div className="crossing-body">
        <motion.div
          key={`${dimKey}-${metric}`}
          className="chart"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          role="img"
          aria-label={`${METRICS.find((m) => m.value === metric)!.label} par ${dim.label}`}
        >
          <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 46 + 30)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 64, bottom: 4, left: 8 }}
              onClick={(state: { activeTooltipIndex?: number | string | null }) => {
                const g = groups[Number(state.activeTooltipIndex)]
                if (g) toggleFilter(g)
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                stroke={c.muted}
                tick={{ fill: c.muted, fontSize: 12 }}
                tickLine={false}
                // Le zéro reste toujours visible : une barre part de 0, jamais du milieu de l'axe.
                domain={metric === 'winRate' ? [0, 1] : [(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]}
                tickFormatter={(v: number) =>
                  metric === 'winRate' ? formatPercent(v) : `${v.toLocaleString('fr-BE', { maximumFractionDigits: 1 })} R`
                }
              />
              <YAxis type="category" dataKey="name" width={labelWidth} stroke={c.muted} tick={{ fill: c.text, fontSize: 12 }} tickLine={false} axisLine={false} />
              {metric !== 'winRate' && <ReferenceLine x={0} stroke={c.muted} />}
              <Tooltip content={<GroupTooltip isActive={(g) => g.value !== null && hasDimension(filters, dimKey, g.value)} />} cursor={{ fill: c.grid, fillOpacity: 0.35 }} />
              <Bar dataKey="metricValue" radius={4} barSize={26} animationDuration={600}>
                {chartData.map((g) => {
                  const active = g.value !== null && hasDimension(filters, dimKey, g.value)
                  return (
                    <Cell
                      key={g.name}
                      fill={barColor(g)}
                      fillOpacity={g.reliable ? 0.9 : 0.35}
                      stroke={active ? c.violet : 'none'}
                      strokeWidth={active ? 2 : 0}
                    />
                  )
                })}
                <LabelList
                  dataKey="metricValue"
                  position="right"
                  fill={c.text}
                  fontSize={12}
                  formatter={(v: unknown) => formatMetric(Number(v), metric)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-note muted">Barres pâles : moins de 5 trades, résultat peu fiable. Barre entourée de mauve : filtre actif.</p>
        </motion.div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.key} aria-sort={sort?.key === col.key ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
                    <button type="button" onClick={() => sortBy(col.key)}>
                      {col.label}
                      <span className="sort-arrow" aria-hidden="true">
                        {sort?.key === col.key ? (sort.desc ? '▼' : '▲') : '↕'}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <motion.tr
                  key={`${dimKey}-${label(g)}`}
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  className={g.reliable ? '' : 'low'}
                  tabIndex={0}
                  onClick={() => onOpen({ title: `${dim.label} : ${label(g)}`, trades: g.trades })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onOpen({ title: `${dim.label} : ${label(g)}`, trades: g.trades })
                  }}
                >
                  <td>
                    {label(g)} {!g.reliable && <LowSample count={g.count} />}
                  </td>
                  <td>{g.count}</td>
                  <td>{g.winRate === null ? '—' : formatPercent(g.winRate)}</td>
                  <td className={g.avgR === null ? '' : rClass(g.avgR)}>{g.avgR === null ? '—' : formatR(g.avgR)}</td>
                  <td className={rClass(g.totalR)}>{formatR(g.totalR)}</td>
                  <td>{g.profitFactor === null ? '—' : formatNumber(g.profitFactor)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.section>
  )
}

function GroupTooltip({
  active,
  payload,
  isActive,
}: {
  active?: boolean
  payload?: { payload: Group & { name: string } }[]
  isActive: (g: Group) => boolean
}) {
  const g = payload?.[0]?.payload
  if (!active || !g) return null
  return (
    <div className="tooltip">
      <strong>{g.name}</strong>
      <span>
        {g.count} trade{g.count > 1 ? 's' : ''} · {g.winRate === null ? '—' : formatPercent(g.winRate)} gagnants
      </span>
      <span>
        Total : <span className={rClass(g.totalR)}>{formatR(g.totalR)}</span> · Espérance :{' '}
        <span className={g.avgR === null ? '' : rClass(g.avgR)}>{g.avgR === null ? '—' : formatR(g.avgR)}</span>
      </span>
      {!g.reliable && <span className="muted">Moins de 5 trades : peu fiable</span>}
      {g.value !== null && (
        <span className="tooltip-hint">{isActive(g) ? 'Clic → retirer ce filtre' : 'Clic → filtrer sur cette valeur'}</span>
      )}
    </div>
  )
}
