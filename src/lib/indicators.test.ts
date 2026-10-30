import { describe, expect, it } from 'vitest'
import { curveFocus, DEFAULT_INDICATORS, parseChoice } from './indicators'
import { computeOverview } from './stats'
import { makeTrade } from '../test/makeTrade'

const series = (rs: number[]) =>
  rs.map((r, i) => makeTrade({ rr_closed: r, traded_at: `2026-05-${String(i + 1).padStart(2, '0')}T13:30:00Z` }))

describe('parseChoice', () => {
  it('garde un choix valide', () => {
    expect(parseChoice('["sqn","best"]')).toEqual(['sqn', 'best'])
  })

  it('retire les inconnus et les doublons, et garde au plus 5 indicateurs', () => {
    expect(parseChoice('["sqn","inconnu","sqn","best","count","beRate","avgR","worst"]')).toEqual(['sqn', 'best', 'count', 'beRate', 'avgR'])
  })

  it('revient au choix par défaut si la mémoire est vide ou abîmée', () => {
    expect(parseChoice(null)).toEqual(DEFAULT_INDICATORS)
    expect(parseChoice('pas du json')).toEqual(DEFAULT_INDICATORS)
    expect(parseChoice('[]')).toEqual(DEFAULT_INDICATORS)
    expect(parseChoice('{"a":1}')).toEqual(DEFAULT_INDICATORS)
  })
})

describe('curveFocus', () => {
  it('situe la plus forte baisse et les séries sur la courbe', () => {
    const stats = computeOverview(series([1, -1, -1, 2, 1, 1]))
    expect(curveFocus(stats, 'maxDrawdown')).toMatchObject({ x1: 1, x2: 3 })
    expect(curveFocus(stats, 'lossStreak')).toMatchObject({ x1: 1, x2: 3 })
    expect(curveFocus(stats, 'winStreak')).toMatchObject({ x1: 3, x2: 6 })
    expect(curveFocus(stats, 'avgR')).toBeNull()
  })
})
