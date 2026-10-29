import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Lightbox, type LightboxItem } from '../components/Lightbox'
import { PageState } from '../components/PageState'
import { useFilteredTrades, usePageTitle } from '../hooks/useFilters'
import { riseIn, stagger } from '../lib/motion'
import { tradeProperties } from '../lib/properties'
import { useCaptures, type Capture } from '../lib/queries'
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

  const left = allTrades.find((t) => t.id === a) ?? null
  const right = allTrades.find((t) => t.id === b) ?? null

  const choose = (side: 'a' | 'b', id: string) => {
    const ids = side === 'a' ? [id, b] : [a, id]
    navigate({ pathname: `/comparer/${ids.map((x) => x || '-').join('/')}`, search }, { replace: true })
  }
  const swap = () => navigate({ pathname: `/comparer/${b || '-'}/${a || '-'}`, search }, { replace: true })

  const rows = left && right ? tradeProperties(left).map(([label, va], i) => [label, va, tradeProperties(right)[i][1]] as const) : []
  // La ligne « RR closed » du tableau compte aussi.
  const differences = rows.filter(([, va, vb]) => va !== vb).length + Number(left?.rr_closed !== right?.rr_closed)

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Comparer deux trades</h2>
          <p className="muted">
            {left && right
              ? `${differences} différence${differences > 1 ? 's' : ''} sur ${rows.length + 1} propriétés, surlignée${differences > 1 ? 's' : ''} en mauve.`
              : 'Choisis deux trades à mettre côte à côte.'}
          </p>
        </div>
        <button type="button" className="secondary" onClick={swap} disabled={!left && !right}>
          ⇄ Inverser
        </button>
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
                <tr className={left.rr_closed !== right.rr_closed ? 'different' : ''}>
                  <td>RR closed</td>
                  <td className={left.rr_closed === null ? '' : rClass(left.rr_closed)}>{left.rr_closed === null ? '—' : formatR(left.rr_closed)}</td>
                  <td className={right.rr_closed === null ? '' : rClass(right.rr_closed)}>{right.rr_closed === null ? '—' : formatR(right.rr_closed)}</td>
                </tr>
                {rows.map(([label, va, vb], i) => (
                  <motion.tr
                    key={label}
                    className={va !== vb ? 'different' : ''}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.03 }}
                  >
                    <td>{label}</td>
                    <td>{va ?? '—'}</td>
                    <td>{vb ?? '—'}</td>
                  </motion.tr>
                ))}
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
  if (shots.length === 0) return <p className="muted compare-empty">Pas de capture pour ce trade.</p>
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
