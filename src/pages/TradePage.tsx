import { Link, useLocation, useParams } from 'react-router'
import { useTrades } from '../lib/queries'
import { formatDate, formatR, rClass, type Trade } from '../lib/trades'
import { usePageTitle } from '../hooks/useFilters'

// Fiche trade, première version : les propriétés. Captures et navigation arrivent en phase D.
export function TradePage() {
  const { id } = useParams()
  const { search } = useLocation()
  const { data: trades, isPending, error } = useTrades()
  const trade = trades?.find((t) => t.id === id)
  usePageTitle(trade ? `${trade.instrument ?? 'Trade'} · ${formatDate(trade)}` : 'Trade')

  const back = (
    <Link className="back" to={{ pathname: '/', search }}>
      ← Vue d'ensemble
    </Link>
  )

  if (isPending) return <p className="muted">Chargement…</p>
  if (error) return <p className="error">Impossible de charger le trade : {error.message}</p>
  if (!trade) {
    return (
      <>
        {back}
        <p className="muted">Ce trade n'existe pas ou a été supprimé dans Notion.</p>
      </>
    )
  }

  return (
    <>
      {back}
      <header className="trade-header">
        <h2>
          {trade.instrument ?? '—'} {trade.direction ?? ''}
        </h2>
        <span className="muted">{formatDate(trade)}</span>
        {trade.rr_closed !== null && (
          <strong className={`trade-r ${rClass(trade.rr_closed)}`}>{formatR(trade.rr_closed)}</strong>
        )}
      </header>

      <div className="panel">
        <dl className="props">
          {properties(trade).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </div>

      {trade.narrative && (
        <div className="panel">
          <h3>Trade narrative</h3>
          <p className="prose">{trade.narrative}</p>
        </div>
      )}
      {trade.review && (
        <div className="panel">
          <h3>Review</h3>
          <p className="prose">{trade.review}</p>
        </div>
      )}
    </>
  )
}

function properties(t: Trade): [string, string | null][] {
  return [
    ['Résultat Notion', t.notion_result],
    ['Pris', t.taken ? 'Oui' : 'Non'],
    ['Session', t.ny_hour],
    ['Jour', t.day],
    ['HTF range TF', t.htf_range_tf],
    ['LTF retracement TF', t.ltf_retracement_tf],
    ['FVG against présent', t.fvg_against ? 'Oui' : 'Non'],
    ['SL placement', t.sl_placement],
    ['TP', t.tp],
    ['Achievable RR', t.achievable_rr_text],
    ['BE', t.be_effect],
    ['Émotions', t.emotions],
  ]
}
