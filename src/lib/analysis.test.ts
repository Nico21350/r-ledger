import { describe, expect, it } from 'vitest'
import { calendarDays, calendarWeeks, cellKey, groupBy, heatmap, histogram, median, monthTotals, summarize } from './analysis'
import { brusselsHour, DIMENSION_BY_KEY, weekday } from './dimensions'
import { makeTrade } from '../test/makeTrade'

describe('summarize', () => {
  it('calcule espérance, win rate et profit factor', () => {
    const s = summarize([2, -1, 0, 1].map((r) => makeTrade({ rr_closed: r })))
    expect(s).toMatchObject({ count: 4, totalR: 2, avgR: 0.5, winRate: 0.5, wins: 2, losses: 1, be: 1, profitFactor: 3 })
  })

  it('ignore les trades sans RR closed et signale un petit échantillon', () => {
    const s = summarize([makeTrade({ rr_closed: null }), makeTrade({ rr_closed: 1 })])
    expect(s.count).toBe(1)
    expect(s.reliable).toBe(false)
    expect(s.profitFactor).toBe(Infinity)
  })

  it('renvoie des valeurs vides pour un groupe sans trade', () => {
    expect(summarize([])).toMatchObject({ count: 0, avgR: null, winRate: null, profitFactor: null })
  })
})

describe('groupBy', () => {
  it("respecte l'ordre imposé et met « non renseigné » en dernier", () => {
    const trades = [
      makeTrade({ ny_hour: 'NY-2' }),
      makeTrade({ ny_hour: null }),
      makeTrade({ ny_hour: 'London' }),
      makeTrade({ ny_hour: 'NY-2' }),
    ]
    const groups = groupBy(trades, DIMENSION_BY_KEY.session.get, DIMENSION_BY_KEY.session.order)
    expect(groups.map((g) => [g.value, g.count])).toEqual([
      ['London', 1],
      ['NY-2', 2],
      [null, 1],
    ])
  })
})

describe('dimensions', () => {
  it("lit le jour et l'heure à Bruxelles", () => {
    // 22h30 UTC le mardi 12 mai = 0h30 le mercredi 13 mai à Bruxelles.
    const t = makeTrade({ traded_at: '2026-05-12T22:30:00Z' })
    expect(weekday(t)).toBe('Mercredi')
    expect(brusselsHour(t)).toBe('0h')
    expect(brusselsHour(makeTrade({ has_time: false }))).toBeNull()
  })
})

describe('heatmap', () => {
  it('crée une case par combinaison présente', () => {
    const trades = [
      makeTrade({ traded_at: '2026-05-12T13:30:00Z', ny_hour: 'NY-1', rr_closed: 2 }), // mardi
      makeTrade({ traded_at: '2026-05-19T13:30:00Z', ny_hour: 'NY-1', rr_closed: -1 }), // mardi
      makeTrade({ traded_at: '2026-05-13T13:30:00Z', ny_hour: 'NY-2', rr_closed: 1 }), // mercredi
    ]
    const h = heatmap(trades, DIMENSION_BY_KEY.jour, DIMENSION_BY_KEY.session)
    expect(h.rows).toEqual(['Mardi', 'Mercredi'])
    expect(h.cols).toEqual(['NY-1', 'NY-2'])
    expect(h.cells.get(cellKey('Mardi', 'NY-1'))?.totalR).toBe(1)
    expect(h.cells.has(cellKey('Mercredi', 'NY-1'))).toBe(false)
  })
})

describe('histogram', () => {
  it('range chaque R dans la colonne la plus proche et garde les colonnes vides', () => {
    const bins = histogram([-1, -1, 0, 1.4, 2].map((r) => makeTrade({ rr_closed: r })), 0.5)
    expect(bins.map((b) => [b.center, b.count])).toEqual([
      [-1, 2],
      [-0.5, 0],
      [0, 1],
      [0.5, 0],
      [1, 0],
      [1.5, 1],
      [2, 1],
    ])
  })

  it('calcule la médiane', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
    expect(median([])).toBeNull()
  })
})

describe('calendrier', () => {
  it('découpe la période en semaines du lundi au dimanche', () => {
    const weeks = calendarWeeks('2026-05-13', '2026-05-18') // mercredi → lundi suivant
    expect(weeks).toHaveLength(2)
    expect(weeks[0][0]).toBe('2026-05-11')
    expect(weeks[1][6]).toBe('2026-05-24')
  })

  it('additionne les R par jour et par mois', () => {
    const days = calendarDays([
      makeTrade({ traded_at: '2026-05-12T09:00:00Z', rr_closed: 2 }),
      makeTrade({ traded_at: '2026-05-12T15:00:00Z', rr_closed: -1 }),
      makeTrade({ traded_at: '2026-06-01T15:00:00Z', rr_closed: 3 }),
      makeTrade({ traded_at: null, rr_closed: 5 }),
    ])
    expect(days.get('2026-05-12')?.totalR).toBe(1)
    expect(days.size).toBe(2)
    expect(monthTotals(days)).toEqual([
      { month: '2026-05', totalR: 1, count: 2 },
      { month: '2026-06', totalR: 3, count: 1 },
    ])
  })
})
