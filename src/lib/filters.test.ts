import { describe, expect, it } from 'vitest'
import {
  applyFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  hasDimension,
  withDimension,
  withoutDimension,
  parseFilters,
  presetRange,
  previousRange,
  serializeFilters,
  type Filters,
} from './filters'
import { makeTrade } from '../test/makeTrade'

describe('adresse de la page', () => {
  it('relit exactement les filtres écrits', () => {
    const filters: Filters = {
      from: '2026-05-01',
      to: '2026-06-30',
      instruments: ['NQ1!', 'ES1!'],
      sessions: ['NY-1'],
      direction: 'SELL',
      taken: 'non-pris',
      criteria: { jour: 'Mardi', fvg: 'Oui', emotion: '1 - calme' },
    }
    expect(parseFilters(serializeFilters(filters))).toEqual(filters)
  })

  it("n'écrit rien quand aucun filtre n'est actif", () => {
    expect(serializeFilters(EMPTY_FILTERS).toString()).toBe('')
  })

  it('ignore les valeurs invalides tapées dans l’adresse', () => {
    const filters = parseFilters(new URLSearchParams('du=hier&sens=LONG&trades=peut-etre'))
    expect(filters).toEqual(EMPTY_FILTERS)
  })
})

describe('applyFilters', () => {
  const nq = makeTrade({ instrument: 'NQ1!', ny_hour: 'NY-1', direction: 'BUY', taken: true })
  const es = makeTrade({ instrument: 'ES1!', ny_hour: 'NY-2', direction: 'SELL', taken: false })
  const all = [nq, es]

  it('filtre par instrument, session, sens et pris / non pris', () => {
    expect(applyFilters(all, { ...EMPTY_FILTERS, instruments: ['ES1!'] })).toEqual([es])
    expect(applyFilters(all, { ...EMPTY_FILTERS, sessions: ['NY-1'] })).toEqual([nq])
    expect(applyFilters(all, { ...EMPTY_FILTERS, direction: 'SELL' })).toEqual([es])
    expect(applyFilters(all, { ...EMPTY_FILTERS, taken: 'pris' })).toEqual([nq])
    expect(applyFilters(all, { ...EMPTY_FILTERS, taken: 'non-pris' })).toEqual([es])
  })

  it('compare les dates en heure de Bruxelles', () => {
    // 22h30 UTC le 12 mai = 0h30 le 13 mai à Bruxelles (heure d'été, +2h).
    const lateNight = makeTrade({ traded_at: '2026-05-12T22:30:00Z' })
    expect(applyFilters([lateNight], { ...EMPTY_FILTERS, from: '2026-05-13' })).toEqual([lateNight])
    expect(applyFilters([lateNight], { ...EMPTY_FILTERS, to: '2026-05-12' })).toEqual([])
  })

  it('exclut les trades sans date quand une période est choisie', () => {
    const noDate = makeTrade({ traded_at: null })
    expect(applyFilters([noDate], EMPTY_FILTERS)).toEqual([noDate])
    expect(applyFilters([noDate], { ...EMPTY_FILTERS, from: '2026-01-01' })).toEqual([])
  })
})

describe('countActiveFilters', () => {
  it('compte la période comme un seul filtre', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, from: '2026-01-01', to: '2026-02-01', direction: 'BUY' })).toBe(2)
  })
})

describe('presetRange', () => {
  it('calcule les raccourcis de période', () => {
    expect(presetRange('tout', '2026-10-28')).toEqual({ from: null, to: null })
    expect(presetRange('30j', '2026-10-28')).toEqual({ from: '2026-09-29', to: '2026-10-28' })
    expect(presetRange('3m', '2026-10-28')).toEqual({ from: '2026-07-28', to: '2026-10-28' })
    expect(presetRange('annee', '2026-10-28')).toEqual({ from: '2026-01-01', to: '2026-10-28' })
  })

  it('reste dans le bon mois pour les fins de mois', () => {
    expect(presetRange('3m', '2026-05-31').from).toBe('2026-02-28')
  })
})

describe('previousRange', () => {
  it('prend la période de même durée juste avant', () => {
    expect(previousRange({ ...EMPTY_FILTERS, from: '2026-09-01', to: '2026-09-30' }, '2026-10-28')).toEqual({
      from: '2026-08-02',
      to: '2026-08-31',
    })
  })

  it("va jusqu'à aujourd'hui sans date de fin", () => {
    expect(previousRange({ ...EMPTY_FILTERS, from: '2026-10-19' }, '2026-10-28')).toEqual({
      from: '2026-10-09',
      to: '2026-10-18',
    })
  })

  it("ne compare rien sans date de début", () => {
    expect(previousRange(EMPTY_FILTERS, '2026-10-28')).toBeNull()
  })
})

describe('critères de l’écran Analyses', () => {
  const tuesday = makeTrade({ traded_at: '2026-05-12T13:30:00Z', htf_range_tf: 'H1', fvg_against: true })
  const wednesday = makeTrade({ traded_at: '2026-05-13T13:30:00Z', htf_range_tf: 'H4', fvg_against: false })

  it('filtre sur le jour, le HTF et le FVG', () => {
    expect(applyFilters([tuesday, wednesday], { ...EMPTY_FILTERS, criteria: { jour: 'Mardi' } })).toEqual([tuesday])
    expect(applyFilters([tuesday, wednesday], { ...EMPTY_FILTERS, criteria: { htf: 'H4' } })).toEqual([wednesday])
    expect(applyFilters([tuesday, wednesday], { ...EMPTY_FILTERS, criteria: { fvg: 'Oui' } })).toEqual([tuesday])
  })

  it('applique et retire une dimension, y compris celles du menu', () => {
    const f = withDimension(withDimension(EMPTY_FILTERS, 'session', 'NY-2'), 'jour', 'Mardi')
    expect(f.sessions).toEqual(['NY-2'])
    expect(hasDimension(f, 'jour', 'Mardi')).toBe(true)
    expect(countActiveFilters(f)).toBe(2)
    expect(withoutDimension(withoutDimension(f, 'jour'), 'session')).toEqual(EMPTY_FILTERS)
    expect(withDimension(EMPTY_FILTERS, 'pris', 'Non pris').taken).toBe('non-pris')
  })
})
