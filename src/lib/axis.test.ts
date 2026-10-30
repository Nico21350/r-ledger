import { describe, expect, it } from 'vitest'
import { axisR, niceTicks } from './axis'

describe('niceTicks', () => {
  it('donne des graduations rondes qui couvrent les valeurs', () => {
    expect(niceTicks(-0.3, 1.7)).toEqual({ ticks: [-0.5, 0, 0.5, 1, 1.5, 2], decimals: 1 })
    expect(niceTicks(-1.5, 33.3).ticks).toEqual([-10, 0, 10, 20, 30, 40])
  })

  it('ajoute des décimales quand les valeurs sont proches : jamais deux libellés identiques', () => {
    const { ticks, decimals } = niceTicks(1.36, 1.44)
    const labels = ticks.map((t) => t.toFixed(decimals))
    expect(new Set(labels).size).toBe(labels.length)
    expect(ticks[0]).toBeLessThanOrEqual(1.36)
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(1.44)
  })

  it('gère une valeur unique', () => {
    expect(niceTicks(1, 1).ticks.length).toBeGreaterThan(1)
  })
})

describe('axisR', () => {
  it('utilise le vrai signe moins', () => {
    expect(axisR(-1.5)).toBe('−1,5 R')
    expect(axisR(2)).toBe('2 R')
  })
})
