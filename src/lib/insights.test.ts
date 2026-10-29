import { describe, expect, it } from 'vitest'
import { computeInsights } from './insights'
import { makeTrade } from '../test/makeTrade'

describe('constats automatiques', () => {
  // 6 trades NY-2 gagnants, 6 trades NY-1 perdants : NY-2 doit ressortir comme point fort, NY-1 comme point faible.
  const trades = [
    ...Array.from({ length: 6 }, () => makeTrade({ ny_hour: 'NY-2', rr_closed: 2 })),
    ...Array.from({ length: 6 }, () => makeTrade({ ny_hour: 'NY-1', rr_closed: -1 })),
  ]

  it('repère le point fort et ce qui coûte', () => {
    const insights = computeInsights(trades, { runs: 50 })
    const best = insights.find((i) => i.id === 'best')!
    const worst = insights.find((i) => i.id === 'worst')!
    expect(best.filter).toEqual({ session: 'NY-2' })
    expect(best.text).toContain('+2 R')
    expect(worst.filter).toEqual({ session: 'NY-1' })
    expect(worst.tone).toBe('loss')
  })

  it('annonce une baisse à prévoir', () => {
    const insights = computeInsights(trades, { runs: 50 })
    expect(insights.find((i) => i.id === 'drawdown')?.section).toBe('monte-carlo')
  })

  it('ne dit rien avec trop peu de trades', () => {
    expect(computeInsights(trades.slice(0, 3))).toEqual([])
  })
})
