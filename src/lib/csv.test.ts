import { describe, expect, it } from 'vitest'
import { tradesToCsv } from './csv'
import { makeTrade } from '../test/makeTrade'

describe('export CSV', () => {
  const csv = tradesToCsv([
    makeTrade({ traded_at: '2026-05-12T13:30:00Z', rr_closed: 2.5, narrative: 'Entrée "propre" ; patiente\nbon trade' }),
    makeTrade({ traded_at: '2026-05-13T00:00:00Z', has_time: false, rr_closed: -1, taken: false }),
  ])
  const lines = csv.replace('﻿', '').trim().split('\r\n')

  it("commence par la marque UTF-8 et la ligne d'en-tête", () => {
    expect(csv.startsWith('﻿')).toBe(true)
    expect(lines[0].split(';')[0]).toBe('Date (Bruxelles)')
  })

  it('écrit la date en heure de Bruxelles et les R avec une virgule', () => {
    expect(lines[1].startsWith('2026-05-12 15:30;Mardi;NQ1!;BUY')).toBe(true)
    expect(lines[1]).toContain(';2,5;')
    expect(csv).toContain('2026-05-13;Mercredi')
    expect(csv).toContain(';Non;-1;')
  })

  it('protège les textes qui contiennent ; " ou un retour à la ligne', () => {
    expect(csv).toContain('"Entrée ""propre"" ; patiente\nbon trade"')
  })
})
