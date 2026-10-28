import { describe, expect, it } from 'vitest'
import { brusselsDay, formatR, rClass } from './trades'

describe('formatR', () => {
  it('écrit toujours le signe, à la française', () => {
    expect(formatR(1.5)).toBe('+1,5 R')
    expect(formatR(-1)).toBe('−1 R')
    expect(formatR(0)).toBe('0 R')
    expect(formatR(2.456)).toBe('+2,46 R')
  })

  it("n'écrit pas « −0 » pour une valeur arrondie à zéro", () => {
    expect(formatR(-0.001)).toBe('0 R')
  })
})

describe('rClass', () => {
  it('donne la couleur selon le signe', () => {
    expect(rClass(2)).toBe('gain')
    expect(rClass(-2)).toBe('loss')
    expect(rClass(0)).toBe('')
  })
})

describe('brusselsDay', () => {
  it("tient compte de l'heure d'été et d'hiver", () => {
    expect(brusselsDay('2026-07-01T22:30:00Z')).toBe('2026-07-02') // +2h
    expect(brusselsDay('2026-01-01T22:30:00Z')).toBe('2026-01-01') // +1h
    expect(brusselsDay(null)).toBeNull()
  })
})
