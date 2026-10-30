import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Lightbox, type LightboxItem } from '../components/Lightbox'
import { PageState } from '../components/PageState'
import { useFilteredTrades, usePageTitle } from '../hooks/useFilters'
import { riseIn, stagger } from '../lib/motion'
import { tradeProperties } from '../lib/properties'
import { useCaptures, type Capture } from '../lib/queries'
import { computeOverview } from '../lib/stats'
import { formatDate, formatR, rClass, type Trade } from '../lib/trades'

const tradeLabel = (t: Trade, i: number) =>
  `n°${i + 1} · ${t.instrument ?? '—'} ${t.direction ?? ''} · ${formatDate(t)}${t.rr_closed === null ? '' : ` · ${formatR(t.rr_closed)}`}`

// Deux trades côte à côte : captures, résultat et propriétés ; les différences sont surlignées.
// Adresse : /comparer/:a/:b (les deux identifiants sont facultatifs).
export function ComparePage() {
  usePageTitle('Comparer deux trades')
  const { a, b } = useParams()
  const { search } = useLocation()
  const navigate = useNavigate()
  const { allTrades, isPending, error } = useFilteredTrades()
  const captures = useCaptures()
  const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null)

  const [onlyDifferences, setOnlyDifferences] = useState(false)

  // Sans trade dans l'adresse : le meilleur contre le pire, pour que la page ne soit jamais vide
  // (parmi les trades qui ont des captures, s'il y en a, pour montrer aussi les graphiques).
  // On attend les captures avant de choisir, sinon la paire changerait sous les yeux à leur arrivée.
  const pair = useMemo(() => {
    if (captures.isPending) return null
    const withShots = allTrades.filter((t) => (captures.data?.get(t.id)?.length ?? 0) > 0)
    const onlyWithShots = withShots.length >= 2
    const { best, worst } = computeOverview(onlyWithShots ? withShots : allTrades)
    return best && worst && best.trade.id !== worst.trade.id ? { best: best.trade, worst: worst.trade, onlyWithShots } : null
  }, [allTrades, captures.data, captures.isPending])
  const showcase = !a && !b ? pair : null
  const choosing = !a && !b && captures.isPending
  const left = showcase ? showcase.best : (allTrades.find((t) => t.id === a) ?? null)
  const right = showcase ? showcase.worst : (allTrades.find((t) => t.id === b) ?? null)

  const go = (ids: (string | undefined)[]) =>
    navigate({ pathname: `/comparer/${ids.map((x) => x || '-').join('/')}`, search }, { replace: true })
  const choose = (side: 'a' | 'b', id: string) => go(side === 'a' ? [id, right?.id] : [left?.id, id])
  const swap = () => go([right?.id, left?.id])

  const rows = left && right ? tradeProperties(left).map(([label, va], i) => [label, va, tradeProperties(right)[i][1]] as const) : []
  // La ligne « RR closed » du tableau compte aussi.
  const differences = rows.filter(([, va, vb]) => va !== vb).length + Number(left?.rr_closed !== right?.rr_closed)

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Comparer deux trades</h2>
          <p className="panel-lede">Deux trades côte à côte : ce qui les différencie est surligné en mauve.</p>
          <p className="muted">
            {showcase &&
              `Meilleur trade contre pire trade${showcase.onlyWithShots ? ' (parmi ceux qui ont des captures)' : ''} : choisis-en d'autres dans les listes. `}
            {left && right
              ? `${differences} différence${differences > 1 ? 's' : ''} sur ${rows.length + 1} propriétés.`
              : choosing
                ? 'Chargement des captures…'
                : 'Choisis deux trades à mettre côte à côte.'}
          </p>
        </div>
        <div className="toolbar">
          {left && right && (
            <button
              type="button"
              role="switch"
              aria-checked={onlyDifferences}
              className={`switch${onlyDifferences ? ' on' : ''}`}
              onClick={() => setOnlyDifferences((o) => !o)}
            >
              <span className="switch-track">
                <motion.span className="switch-thumb" layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} />
              </span>
              Seulement les différences
            </button>
          )}
          <button type="button" className="secondary" onClick={swap} disabled={!left && !right}>
            ⇄ Inverser
          </button>
        </div>
      </div>

      <PageState isPending={isPending} error={error} total={allTrades.length} filtered={allTrades.length}>
        <motion.div className="compare" initial="hidden" animate="show" variants={stagger}>
          {(['a', 'b'] as const).map((side) => {
            const trade = side === 'a' ? left : right
            const shots = trade ? (captures.data?.get(trade.id) ?? []) : []
            return (
              <motion.section key={side} className="panel compare-side" variants={riseIn}>
                <select
                  className="compare-select"
                  value={trade?.id ?? ''}
                  onChange={(e) => choose(side, e.target.value)}
                  aria-label={side === 'a' ? 'Premier trade' : 'Second trade'}
                >
                  <option value="">Choisir un trade…</option>
                  {allTrades.map((t, i) => (
                    <option key={t.id} value={t.id}>
                      {tradeLabel(t, i)}
                    </option>
                  ))}
                </select>
                <AnimatePresence mode="wait">
                  {trade ? (
                    <motion.div
                      key={trade.id}
                      className="compare-body"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="compare-head">
                        <div>
                          <h3>
                            {trade.instrument ?? '—'} {trade.direction ?? ''}
                          </h3>
                          <span className="muted">{formatDate(trade)}</span>
                        </div>
                        {trade.rr_closed !== null && <strong className={`compare-r ${rClass(trade.rr_closed)}`}>{formatR(trade.rr_closed)}</strong>}
                      </div>
                      <CompareShot
                        shots={shots}
                        onOpen={(index) => setLightbox({ items: shots.map((capture) => ({ capture, trade })), index })}
                      />
                      <Link className="link-button" to={{ pathname: `/trade/${trade.id}`, search }}>
                        Ouvrir la fiche →
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.p key="empty" className="muted compare-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      Aucun trade choisi.
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.section>
            )
          })}
        </motion.div>

        {rows.length > 0 && left && right && (
          <motion.section className="panel" variants={riseIn} initial="hidden" animate="show">
            <table className="data-table compare-table">
              <colgroup>
                <col className="compare-label-col" />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th>Propriété</th>
                  <th>
                    {left.instrument} {left.direction}
                  </th>
                  <th>
                    {right.instrument} {right.direction}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* « Seulement les différences » : les lignes identiques se replient. */}
                <AnimatePresence initial={false}>
                  {(!onlyDifferences || left.rr_closed !== right.rr_closed) && (
                    <motion.tr
                      key="rr"
                      className={left.rr_closed !== right.rr_closed ? 'different' : ''}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }}
                    >
                      <td>RR closed</td>
                      <td className={left.rr_closed === null ? '' : rClass(left.rr_closed)}>{left.rr_closed === null ? '—' : formatR(left.rr_closed)}</td>
                      <td className={right.rr_closed === null ? '' : rClass(right.rr_closed)}>{right.rr_closed === null ? '—' : formatR(right.rr_closed)}</td>
                    </motion.tr>
                  )}
                  {rows
                    .filter(([, va, vb]) => !onlyDifferences || va !== vb)
                    .map(([label, va, vb], i) => (
                      <motion.tr
                        key={label}
                        layout
                        className={va !== vb ? 'different' : ''}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ delay: onlyDifferences ? 0 : 0.15 + i * 0.03, duration: 0.25 }}
                      >
                        <td>{label}</td>
                        <td>{va ?? '—'}</td>
                        <td>{vb ?? '—'}</td>
                      </motion.tr>
                    ))}
                </AnimatePresence>
              </tbody>
            </table>
          </motion.section>
        )}
      </PageState>

      <Lightbox
        items={lightbox?.items ?? []}
        index={lightbox?.index ?? null}
        onIndexChange={(index) => setLightbox((l) => (l ? { ...l, index } : l))}
        onClose={() => setLightbox(null)}
      />
    </>
  )
}

// Grande capture du trade, et les autres en miniatures dessous.
function CompareShot({ shots, onOpen }: { shots: Capture[]; onOpen: (index: number) => void }) {
  if (shots.length === 0) return <span className="recent-placeholder compare-placeholder">Pas de capture pour ce trade</span>
  return (
    <div className="compare-shots">
      <button type="button" className="trade-shot main" onClick={() => onOpen(0)} aria-label="Agrandir la capture">
        <img src={shots[0].url} alt="Capture principale" />
      </button>
      {shots.length > 1 && (
        <div className="compare-thumbs">
          {shots.slice(1).map((s, i) => (
            <button key={s.id} type="button" className="trade-shot" onClick={() => onOpen(i + 1)} aria-label={`Agrandir la capture ${i + 2}`}>
              <img src={s.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
