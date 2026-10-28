import { describe, expect, it } from 'vitest'
import { computeOverview } from './stats'
import { makeTrade } from '../test/makeTrade'

// Des trades aux R donnés, un par jour à partir du 1er mai.
const series = (rs: (number | null)[]) =>
  rs.map((r, i) => makeTrade({ rr_closed: r, traded_at: `2026-05-${String(i + 1).padStart(2, '0')}T13:30:00Z` }))

describe('computeOverview', () => {
  it('calcule total, win rate et R moyen', () => {
    const stats = computeOverview(series([2, -1, -1, 0, 3, 1]))
    expect(stats.count).toBe(6)
    expect(stats.totalR).toBe(4)
    expect(stats.winRate).toBe(0.5)
    expect(stats.avgR).toBeCloseTo(4 / 6)
  })

  it('mesure la plus forte baisse depuis un sommet', () => {
    // Cumul : 2, 1, 0, 0, 3, 4 → sommet à 2 puis creux à 0 = −2 R.
    expect(computeOverview(series([2, -1, -1, 0, 3, 1])).maxDrawdown).toBe(-2)
  })

  it('compte une baisse dès le départ, sous 0 R', () => {
    expect(computeOverview(series([-1, -1, 3])).maxDrawdown).toBe(-2)
  })

  it('trouve les plus longues séries, un BE les interrompt', () => {
    const stats = computeOverview(series([1, 1, 0, 1, -1, -1, -1, 0, -1]))
    expect(stats.longestWinStreak).toBe(2)
    expect(stats.longestLossStreak).toBe(3)
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
    expect(stats.maxDrawdown).toBe(0)
  })
})
