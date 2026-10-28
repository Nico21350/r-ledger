import { describe, expect, it } from 'vitest'
import { computeOverview, rollingStats } from './stats'
import { makeTrade } from '../test/makeTrade'

// Des trades aux R donnés, un par jour à partir du 1er mai.
const series = (rs: (number | null)[]) =>
  rs.map((r, i) => makeTrade({ rr_closed: r, traded_at: `2026-05-${String(i + 1).padStart(2, '0')}T13:30:00Z` }))

describe('computeOverview', () => {
  it('calcule total, win rate et espérance', () => {
    const stats = computeOverview(series([2, -1, -1, 0, 3, 1]))
    expect(stats.count).toBe(6)
    expect(stats.totalR).toBe(4)
    expect(stats.winRate).toBe(0.5)
    expect(stats.beRate).toBeCloseTo(1 / 6)
    expect(stats.avgR).toBeCloseTo(4 / 6)
  })

  it('calcule gain moyen, perte moyenne et profit factor', () => {
    const stats = computeOverview(series([2, -1, -1, 0, 3, 1]))
    expect(stats.avgWin).toBe(2)
    expect(stats.avgLoss).toBe(-1)
    expect(stats.profitFactor).toBe(3) // 6 R gagnés ÷ 2 R perdus
  })

  it('donne un profit factor infini sans aucune perte', () => {
    expect(computeOverview(series([1, 2])).profitFactor).toBe(Infinity)
    expect(computeOverview(series([0])).profitFactor).toBeNull()
  })

  it('mesure la plus forte baisse et la situe sur la courbe', () => {
    // Cumul : 2, 1, 0, 0, 3, 4 → sommet au trade 1, creux au trade 3 = −2 R.
    const stats = computeOverview(series([2, -1, -1, 0, 3, 1]))
    expect(stats.maxDrawdown).toBe(-2)
    expect(stats.drawdownRange).toEqual({ from: 1, to: 3 })
    expect(stats.recoveryFactor).toBe(2) // 4 R ÷ 2 R
    expect(stats.curve.map((p) => p.drawdown)).toEqual([0, -1, -2, -2, 0, 0])
  })

  it('compte une baisse dès le départ, sous 0 R', () => {
    const stats = computeOverview(series([-1, -1, 3]))
    expect(stats.maxDrawdown).toBe(-2)
    expect(stats.drawdownRange).toEqual({ from: 0, to: 2 })
  })

  it("n'a ni baisse ni recovery factor sans perte", () => {
    const stats = computeOverview(series([1, 1]))
    expect(stats.drawdownRange).toBeNull()
    expect(stats.recoveryFactor).toBeNull()
  })

  it('trouve les plus longues séries, un BE les interrompt', () => {
    const stats = computeOverview(series([1, 1, 0, 1, -1, -1, -1, 0, -1]))
    expect(stats.longestWin).toEqual({ type: 'win', length: 2, from: 1, to: 2 })
    expect(stats.longestLoss).toEqual({ type: 'loss', length: 3, from: 5, to: 7 })
    expect(stats.longestWinStreak).toBe(2)
    expect(stats.longestLossStreak).toBe(3)
    expect(stats.streaks).toEqual([{ type: 'loss', length: 3, from: 5, to: 7 }])
  })

  it('repère la série en cours, mais pas après un BE', () => {
    expect(computeOverview(series([-1, 1, 1])).currentStreak).toEqual({ type: 'win', length: 2, from: 2, to: 3 })
    expect(computeOverview(series([1, 1, 0])).currentStreak).toBeNull()
  })

  it('trouve le meilleur et le pire trade, et le sommet', () => {
    const stats = computeOverview(series([2, -1.5, 3, -4]))
    expect(stats.best?.index).toBe(3)
    expect(stats.worst?.index).toBe(4)
    expect(stats.peak?.cumR).toBe(3.5)
  })

  it('calcule le SQN', () => {
    // Moyenne 1, écart-type d'échantillon √(16 ÷ 3), 4 trades → √4 × 1 ÷ √(16 ÷ 3) ≈ 0,866.
    expect(computeOverview(series([3, -1, 3, -1])).sqn).toBeCloseTo(2 / Math.sqrt(16 / 3))
    expect(computeOverview(series([1])).sqn).toBeNull()
  })

  it('ignore les trades sans RR closed', () => {
    const stats = computeOverview(series([1, null, -1]))
    expect(stats.count).toBe(2)
    expect(stats.totalR).toBe(0)
  })

  it('trie par date avant de cumuler', () => {
    const late = makeTrade({ rr_closed: -1, traded_at: '2026-06-01T13:30:00Z' })
    const early = makeTrade({ rr_closed: 2, traded_at: '2026-05-01T13:30:00Z' })
    const { curve } = computeOverview([late, early])
    expect(curve.map((p) => p.cumR)).toEqual([2, 1])
    expect(curve.map((p) => p.index)).toEqual([1, 2])
  })

  it('renvoie des valeurs vides sans trade', () => {
    const stats = computeOverview([])
    expect(stats.count).toBe(0)
    expect(stats.winRate).toBeNull()
    expect(stats.avgR).toBeNull()
    expect(stats.best).toBeNull()
    expect(stats.maxDrawdown).toBe(0)
  })
})

describe('rollingStats', () => {
  it('calcule les stats sur les derniers trades, une fois la fenêtre pleine', () => {
    const { curve } = computeOverview(series([1, -1, 2, 2]))
    expect(rollingStats(curve, 2)).toEqual([
      { index: 2, expectancy: 0, winRate: 0.5 },
      { index: 3, expectancy: 0.5, winRate: 0.5 },
      { index: 4, expectancy: 2, winRate: 1 },
    ])
    expect(rollingStats(curve, 10)).toEqual([])
  })
})
