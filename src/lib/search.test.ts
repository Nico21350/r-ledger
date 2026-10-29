import { describe, expect, it } from 'vitest'
import { neighbours, normalize, searchTrades } from './search'
import { makeTrade } from '../test/makeTrade'

describe('recherche', () => {
  const nq = makeTrade({ instrument: 'NQ1!', direction: 'BUY', rr_closed: 2, emotions: '1 - calme', traded_at: '2026-05-12T13:30:00Z' })
  const es = makeTrade({ instrument: 'ES1!', direction: 'SELL', rr_closed: -1, review: 'Entrée trop tôt', traded_at: '2026-05-13T13:30:00Z' })
  const trades = [nq, es]

  it('ignore les accents et les majuscules', () => {
    expect(normalize('Émotions Entrée')).toBe('emotions entree')
    expect(searchTrades(trades, 'ENTREE')).toEqual([es])
  })

  it('demande que chaque mot corresponde', () => {
    expect(searchTrades(trades, 'nq buy')).toEqual([nq])
    expect(searchTrades(trades, 'nq sell')).toEqual([])
    expect(searchTrades(trades, 'mardi')).toEqual([nq])
  })

  it('retrouve un trade par son résultat en R', () => {
    expect(searchTrades(trades, '+2 r')).toEqual([nq])
    expect(searchTrades(trades, '-1r')).toEqual([es])
  })

  it('affiche les plus récents en premier et ne renvoie rien pour une recherche vide', () => {
    expect(searchTrades(trades, '1!')).toEqual([es, nq])
    expect(searchTrades(trades, '   ')).toEqual([])
  })
})

describe('neighbours', () => {
  const [a, b, c] = [makeTrade(), makeTrade(), makeTrade()]

  it('donne le trade précédent et le suivant', () => {
    expect(neighbours([a, b, c], b.id)).toEqual({ index: 1, previous: a, next: c })
    expect(neighbours([a, b, c], a.id).previous).toBeNull()
    expect(neighbours([a, b, c], 'inconnu').index).toBe(-1)
  })
})
