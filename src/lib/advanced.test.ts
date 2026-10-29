import { describe, expect, it } from 'vitest'
import { beEffect, compareAchievable, leftOnTable, parseAchievable } from './analysis'
import { quantile, simulate, streakProbability } from './montecarlo'
import { matchesSetup, rankSetups } from './setups'
import { makeTrade } from '../test/makeTrade'

describe('Achievable RR', () => {
  it('lit les textes libres de Notion', () => {
    expect(parseAchievable('RR4')).toBe(4)
    expect(parseAchievable('4 at HTF draw')).toBe(4)
    expect(parseAchievable('Full at 2, Runner at 3')).toBe(3)
    expect(parseAchievable('0 (BE)')).toBe(0)
    expect(parseAchievable('2,5')).toBe(2.5)
    expect(parseAchievable('pas noté')).toBeNull()
    expect(parseAchievable(null)).toBeNull()
  })

  it('compte les R laissés sur la table', () => {
    expect(leftOnTable(3, 2.3)).toBeCloseTo(0.7)
    expect(leftOnTable(0, -1)).toBe(0)
    expect(leftOnTable(2, -1)).toBe(2)
    expect(leftOnTable(2, 2)).toBe(0)
  })

  it('résume la comparaison', () => {
    const c = compareAchievable([
      makeTrade({ rr_closed: 2, achievable_rr_text: 'RR4' }),
      makeTrade({ rr_closed: -1, achievable_rr_text: '0' }),
      makeTrade({ rr_closed: 1, achievable_rr_text: '???' }),
      makeTrade({ rr_closed: 1, achievable_rr_text: null }),
    ])
    expect(c.points).toHaveLength(2)
    expect(c.unreadable).toBe(1)
    expect(c.totalLeft).toBe(2)
    expect(c.captureRate).toBe(0.5)
  })
})

describe('effet du BE', () => {
  it('compte les R sauvés et manqués, avec une estimation si besoin', () => {
    const e = beEffect([
      makeTrade({ rr_closed: 0, be_effect: 'Prevented loss' }),
      makeTrade({ rr_closed: 0, be_effect: 'Missed win', achievable_rr_text: '3' }),
      makeTrade({ rr_closed: 0, be_effect: 'Missed win', achievable_rr_text: '0 (BE)' }),
      makeTrade({ rr_closed: 2 }),
      makeTrade({ rr_closed: 4 }),
    ])
    expect(e.savedR).toBe(1)
    expect(e.averageWin).toBe(3)
    expect(e.missedR).toBe(6) // 3 (atteignable) + 3 (gain moyen, estimé)
    expect(e.estimatedMissed).toBe(1)
  })
})

describe('setups', () => {
  const trades = [
    ...Array.from({ length: 5 }, () => makeTrade({ ny_hour: 'NY-2', htf_range_tf: 'H1', rr_closed: 2 })),
    ...Array.from({ length: 5 }, () => makeTrade({ ny_hour: 'NY-1', htf_range_tf: 'H1', rr_closed: -1 })),
  ]

  it('vérifie si un trade correspond à une combinaison', () => {
    expect(matchesSetup(trades[0], { session: 'NY-2', htf: 'H1' })).toBe(true)
    expect(matchesSetup(trades[0], { session: 'NY-1' })).toBe(false)
    expect(matchesSetup(trades[0], {})).toBe(true)
  })

  it('classe les combinaisons par espérance, sans doublon inutile', () => {
    const ranked = rankSetups(trades)
    expect(ranked[0].setup).toEqual({ session: 'NY-2' })
    expect(ranked[0].avgR).toBe(2)
    expect(ranked.at(-1)!.setup).toEqual({ session: 'NY-1' })
    // « NY-2 + H1 » réunit les mêmes trades que « NY-2 » : seule la version la plus simple est gardée.
    expect(ranked.some((r) => r.setup.session === 'NY-2' && r.setup.htf)).toBe(false)
  })
})

describe('Monte-Carlo', () => {
  const rs = [2, -1, -1, 2, 0, 2, -1, 3] // total : +6 R

  it("garde le même total quand on mélange seulement l'ordre", () => {
    const sim = simulate(rs, { runs: 200, seed: 7 })
    expect(new Set(sim.finals.map((f) => f.toFixed(6)))).toEqual(new Set(['6.000000']))
    expect(sim.bands).toHaveLength(rs.length + 1)
    expect(Math.min(...sim.maxDrawdowns)).toBeGreaterThanOrEqual(-3)
  })

  it('donne les mêmes résultats avec la même graine', () => {
    const a = simulate(rs, { runs: 50, seed: 3, mode: 'tirage', steps: 20 })
    const b = simulate(rs, { runs: 50, seed: 3, mode: 'tirage', steps: 20 })
    expect(a.finals).toEqual(b.finals)
    expect(a.steps).toBe(20)
  })

  it("calcule la probabilité d'une série de pertes", () => {
    const sim = simulate([-1, -1, -1], { runs: 10 })
    expect(streakProbability(sim, 3)).toBe(1)
    expect(streakProbability(sim, 4)).toBe(0)
  })

  it('calcule les quantiles', () => {
    expect(quantile([0, 10], 0.5)).toBe(5)
    expect(quantile([1, 2, 3, 4, 5], 0.95)).toBeCloseTo(4.8)
  })
})
