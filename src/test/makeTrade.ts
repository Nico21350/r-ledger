import type { Trade } from '../lib/trades'

let counter = 0

// Fabrique un trade de test : seules les valeurs utiles au test sont à préciser.
export function makeTrade(overrides: Partial<Trade> = {}): Trade {
  counter++
  return {
    id: `trade-${counter}`,
    notion_page_id: `page-${counter}`,
    instrument: 'NQ1!',
    direction: 'BUY',
    traded_at: '2026-05-12T13:30:00Z',
    has_time: true,
    day: null,
    ny_hour: 'NY-1',
    htf_range_tf: null,
    ltf_retracement_tf: null,
    fvg_against: false,
    sl_placement: null,
    tp: null,
    notion_result: 'Full Win',
    rr_closed: 1,
    outcome: 'win',
    taken: true,
    achievable_rr: null,
    achievable_rr_text: null,
    be_effect: null,
    emotions: null,
    narrative: null,
    review: null,
    notion_last_edited_at: null,
    synced_at: '2026-10-28T00:00:00Z',
    ...overrides,
  }
}
