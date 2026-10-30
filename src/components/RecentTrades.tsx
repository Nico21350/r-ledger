import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { useCaptures } from '../lib/queries'
import { riseIn, stagger } from '../lib/motion'
import { formatR, rClass, type Trade } from '../lib/trades'

const COUNT = 4

const shortDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels', weekday: 'short', day: 'numeric', month: 'short' })
    : 'Sans date'

// Les 4 derniers trades (filtres appliqués), avec la première capture : un clic ouvre la fiche.
export function RecentTrades({ trades }: { trades: Trade[] }) {
  const captures = useCaptures()
  const navigate = useNavigate()
  const { search } = useLocation()

  const recent = useMemo(
    () =>
      trades
        .filter((t) => t.rr_closed !== null)
        .sort((a, b) => (b.traded_at ?? '').localeCompare(a.traded_at ?? ''))
        .slice(0, COUNT),
    [trades],
  )
  if (recent.length === 0) return null

  return (
    <section className="tile-section">
      <motion.div className="section-head" variants={riseIn}>
        <h3 className="section-title">Derniers trades</h3>
        <Link className="see-all" to={{ pathname: '/galerie', search }}>
          Voir toute la galerie →
        </Link>
      </motion.div>
      <motion.div className="recent-trades" variants={stagger}>
        {recent.map((trade) => {
          const shot = captures.data?.get(trade.id)?.[0]
          const r = trade.rr_closed!
          return (
            <motion.button
              key={trade.id}
              type="button"
              className="gallery-item recent-trade"
              variants={riseIn}
              whileHover={{ y: -4 }}
              onClick={() => navigate({ pathname: `/trade/${trade.id}`, search })}
              aria-label={`Ouvrir la fiche : ${trade.instrument ?? 'trade'} du ${shortDate(trade.traded_at)}, ${formatR(r)}`}
            >
              <span className="gallery-frame">
                {shot ? <img src={shot.url} alt="" loading="lazy" /> : <span className="recent-placeholder">Pas de capture</span>}
                <span className="gallery-caption">
                  <span>
                    <strong className="gallery-date">{shortDate(trade.traded_at)}</strong>
                    <span className="muted">{trade.instrument ?? '—'}</span>
                  </span>
                  <span className={`r-badge ${rClass(r)}`}>{formatR(r)}</span>
                </span>
              </span>
            </motion.button>
          )
        })}
      </motion.div>
    </section>
  )
}
