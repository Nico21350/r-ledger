import type { BrowserContext, Page } from '@playwright/test'

// Données fictives servies à la place de Supabase pendant les tests de bout en bout.
// 12 trades (total +13 R), 3 captures sur 2 jours. Les heures sont en UTC (Bruxelles = UTC+2 en été).

type Fixture = { id: string; at: string; instrument: string; direction: 'BUY' | 'SELL'; session: string; r: number; narrative?: string }

const LIST: Fixture[] = [
  { id: 't01', at: '2026-05-12T13:30:00Z', instrument: 'NQ1!', direction: 'BUY', session: 'NY-1', r: 2 },
  { id: 't02', at: '2026-05-13T14:10:00Z', instrument: 'ES1!', direction: 'SELL', session: 'NY-2', r: -1 },
  { id: 't03', at: '2026-05-19T14:06:00Z', instrument: 'NQ1!', direction: 'SELL', session: 'NY-2', r: 2 },
  { id: 't04', at: '2026-06-02T14:44:00Z', instrument: 'NQ1!', direction: 'BUY', session: 'NY-2', r: 0 },
  { id: 't05', at: '2026-06-10T13:40:00Z', instrument: 'YM1!', direction: 'BUY', session: 'NY-1', r: 3 },
  { id: 't06', at: '2026-07-07T14:20:00Z', instrument: 'NQ1!', direction: 'SELL', session: 'NY-2', r: 2 },
  { id: 't07', at: '2026-08-04T14:46:00Z', instrument: 'YM1!', direction: 'BUY', session: 'NY-2', r: -1 },
  { id: 't08', at: '2026-08-21T15:01:00Z', instrument: 'NQ1!', direction: 'SELL', session: 'NY-2', r: 2.5, narrative: 'Belle patience sur le retracement' },
  { id: 't09', at: '2026-09-15T16:30:00Z', instrument: 'YM1!', direction: 'SELL', session: 'NY-3', r: -1 },
  { id: 't10', at: '2026-10-14T15:28:00Z', instrument: 'NQ1!', direction: 'SELL', session: 'NY-2', r: 2 },
  { id: 't11', at: '2026-10-16T15:01:00Z', instrument: 'NQ1!', direction: 'SELL', session: 'NY-2', r: 3.5 },
  { id: 't12', at: '2026-10-19T15:06:00Z', instrument: 'ES1!', direction: 'BUY', session: 'NY-2', r: -1 },
]

export const TRADES = LIST.map((f, i) => ({
  id: f.id,
  notion_page_id: `page-${f.id}`,
  instrument: f.instrument,
  direction: f.direction,
  traded_at: f.at,
  has_time: true,
  day: null,
  ny_hour: f.session,
  htf_range_tf: i % 2 ? 'H1' : 'H4',
  ltf_retracement_tf: '1min',
  fvg_against: i % 3 === 0,
  sl_placement: 'Wick of entry candle',
  tp: 'Within LTF range',
  notion_result: f.r > 0 ? 'Full Win' : f.r < 0 ? 'Loss' : 'Breakeven',
  rr_closed: f.r,
  outcome: f.r > 0 ? 'win' : f.r < 0 ? 'loss' : 'be',
  taken: true,
  achievable_rr: null,
  achievable_rr_text: f.r > 0 ? String(f.r + 0.5) : '0',
  be_effect: f.r === 0 ? 'Prevented loss' : 'No affect on result',
  emotions: '1 - calme',
  narrative: f.narrative ?? null,
  review: null,
  notion_last_edited_at: null,
  synced_at: '2026-10-28T00:00:00Z',
}))

const IMAGES = [
  { id: 'i1', trade_id: 't11', notion_block_id: 'b1', storage_path: 't11/b1.png', position: 0, created_at: '2026-10-28T00:00:00Z' },
  { id: 'i2', trade_id: 't11', notion_block_id: 'b2', storage_path: 't11/b2.png', position: 1, created_at: '2026-10-28T00:00:00Z' },
  { id: 'i3', trade_id: 't10', notion_block_id: 'b3', storage_path: 't10/b3.png', position: 0, created_at: '2026-10-28T00:00:00Z' },
]

// Image PNG de 1 × 1 pixel, servie pour chaque capture.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

const SUPABASE = 'https://e2e.supabase.test'

// Jeton de connexion factice (même forme qu'un vrai, sans valeur réelle), valable jusqu'en 2100.
const fakeJwt = () => {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: 'user-e2e', exp: 4102444800, role: 'authenticated' })}.signature`
}

// Répond à toutes les requêtes vers la fausse adresse Supabase, et bloque tout le reste d'Internet.
export async function mockSupabase(context: BrowserContext) {
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === 'localhost') return route.continue()
    if (url.origin !== SUPABASE) return route.abort()
    // Autorisations « CORS » : le navigateur vérifie qu'un autre site (ici la fausse adresse Supabase) accepte la requête.
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const json = (body: unknown) => route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname === '/rest/v1/trades') return json(TRADES)
    if (url.pathname === '/rest/v1/trade_images') return json(IMAGES)
    if (url.pathname.startsWith('/storage/v1/object/sign/')) {
      const body = route.request().postData()
      const paths: string[] = body ? (JSON.parse(body) as { paths: string[] }).paths : IMAGES.map((i) => i.storage_path)
      return json(paths.map((path) => ({ path, signedURL: `/object/sign/captures/${path}?token=e2e`, error: null })))
    }
    if (url.pathname.startsWith('/storage/v1/object/')) return route.fulfill({ status: 200, headers, contentType: 'image/png', body: PIXEL })
    if (url.pathname.startsWith('/auth/v1/')) return json({})
    return route.fulfill({ status: 404, body: '' })
  })
}

// Ouvre l'application déjà connectée (session factice rangée là où Supabase la cherche).
export async function signIn(page: Page) {
  await page.addInitScript((token) => {
    const session = {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: 4102444800,
      refresh_token: 'refresh-e2e',
      user: { id: 'user-e2e', aud: 'authenticated', role: 'authenticated', email: 'demo@r-ledger.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
    }
    localStorage.setItem('sb-e2e-auth-token', JSON.stringify(session))
  }, fakeJwt())
}
