// Synchronisation Notion → Supabase.
// Tourne chez Supabase (Edge Function), jamais dans le navigateur : le jeton Notion reste secret.
// Notion est uniquement lu, jamais modifié.

import { createClient } from 'npm:@supabase/supabase-js@2'

const NOTION_DATA_SOURCE_ID = '9ba90cc1-0197-4413-aa38-91dfe86c1cb8'
const NOTION_VERSION = '2025-09-03'
const BUCKET = 'captures'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Seul le propriétaire (secret OWNER_USER_ID) peut lancer la synchronisation ;
  // tout autre compte connecté, comme le compte démo, est refusé.
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: auth } = await supabase.auth.getUser(token)
  if (!auth.user) return json({ error: 'Non connecté' }, 401)
  const owner = Deno.env.get('OWNER_USER_ID')
  if (!owner) return json({ error: 'Secret OWNER_USER_ID manquant' }, 500)
  if (auth.user.id !== owner) return json({ error: 'Réservé au propriétaire : la synchronisation est désactivée en mode démo' }, 403)

  try {
    return json(await sync())
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})

async function sync() {
  const report = { added: 0, updated: 0, unchanged: 0, deleted: 0, imagesAdded: 0, imagesDeleted: 0 }

  const pages = await queryAllPages()
  const { data: existing, error } = await supabase
    .from('trades')
    .select('id, notion_page_id, notion_last_edited_at')
  if (error) throw error
  const known = new Map(existing.map((t) => [t.notion_page_id, t]))

  for (const page of pages) {
    const before = known.get(page.id)
    if (before && new Date(before.notion_last_edited_at).getTime() === new Date(page.last_edited_time).getTime()) {
      report.unchanged++
      continue
    }

    const blocks = await listBlocks(page.id)
    const review = blocks.map(blockText).filter(Boolean).join('\n') || null

    const { data: trade, error } = await supabase
      .from('trades')
      .upsert({ ...pageToRow(page), review, synced_at: new Date().toISOString() }, { onConflict: 'notion_page_id' })
      .select('id')
      .single()
    if (error) throw error
    if (before) report.updated++
    else report.added++

    const images = await syncImages(trade.id, page.id, blocks.filter((b) => b.type === 'image'))
    report.imagesAdded += images.added
    report.imagesDeleted += images.deleted
  }

  // Pages supprimées dans Notion : on les supprime aussi ici, avec leurs captures.
  const notionIds = new Set(pages.map((p) => p.id))
  for (const t of existing) {
    if (notionIds.has(t.notion_page_id)) continue
    const { data: imgs } = await supabase.from('trade_images').select('storage_path').eq('trade_id', t.id)
    if (imgs?.length) await supabase.storage.from(BUCKET).remove(imgs.map((i) => i.storage_path))
    const { error } = await supabase.from('trades').delete().eq('id', t.id)
    if (error) throw error
    report.deleted++
  }

  return report
}

// Télécharge les nouvelles captures, supprime celles retirées de la page Notion.
async function syncImages(tradeId: string, pageId: string, imageBlocks: any[]) {
  const { data: stored, error } = await supabase
    .from('trade_images')
    .select('id, notion_block_id, storage_path')
    .eq('trade_id', tradeId)
  if (error) throw error
  const storedIds = new Set(stored.map((s) => s.notion_block_id))
  const currentIds = new Set(imageBlocks.map((b) => b.id))
  let added = 0

  for (const [position, block] of imageBlocks.entries()) {
    if (storedIds.has(block.id)) {
      await supabase.from('trade_images').update({ position }).eq('notion_block_id', block.id)
      continue
    }
    const url = block.image.type === 'external' ? block.image.external.url : block.image.file?.url
    if (!url) continue

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Téléchargement de capture impossible (${res.status})`)
    const contentType = res.headers.get('content-type') ?? 'image/png'
    const ext = contentType.split('/')[1]?.split(';')[0] || 'png'
    const path = `${pageId}/${block.id}.${ext}`

    const upload = await supabase.storage.from(BUCKET).upload(path, await res.arrayBuffer(), { contentType, upsert: true })
    if (upload.error) throw upload.error
    const { error } = await supabase
      .from('trade_images')
      .insert({ trade_id: tradeId, notion_block_id: block.id, storage_path: path, position })
    if (error) throw error
    added++
  }

  const removed = stored.filter((s) => !currentIds.has(s.notion_block_id))
  if (removed.length) {
    await supabase.storage.from(BUCKET).remove(removed.map((r) => r.storage_path))
    await supabase.from('trade_images').delete().in('id', removed.map((r) => r.id))
  }

  return { added, deleted: removed.length }
}

function pageToRow(page: any) {
  const p = page.properties
  const date = p['Date et heure BE']?.date?.start as string | undefined
  const hasTime = !!date?.includes('T')

  return {
    notion_page_id: page.id,
    notion_last_edited_at: page.last_edited_time,
    instrument: plainText(p['Instrument']?.title),
    direction: p['BUY/SELL']?.select?.name ?? null,
    traded_at: date ? toUtc(date, hasTime) : null,
    has_time: hasTime,
    day: plainText(p['Day']?.rich_text),
    ny_hour: p['NY hour']?.select?.name ?? null,
    htf_range_tf: p['HTF range TF']?.select?.name ?? null,
    ltf_retracement_tf: p['LTF retracement TF']?.select?.name ?? null,
    fvg_against: p['FVG against present']?.checkbox ?? false,
    sl_placement: p['SL placement']?.select?.name ?? null,
    tp: p['TP']?.select?.name ?? null,
    notion_result: p['Result']?.select?.name ?? null,
    rr_closed: p['RR closed']?.number ?? null,
    achievable_rr_text: plainText(p['Achievable RR']?.rich_text),
    be_effect: p['BE']?.select?.name ?? null,
    emotions: p['Emotions']?.select?.name ?? null,
    narrative: plainText(p['Trade narrative']?.rich_text),
  }
}

// Les heures Notion sont des heures belges. Une date sans heure est placée à midi UTC,
// ce qui garde le bon jour calendaire à Bruxelles (13h ou 14h).
function toUtc(start: string, hasTime: boolean): string {
  if (!hasTime) return `${start}T12:00:00Z`
  if (/(Z|[+-]\d{2}:\d{2})$/.test(start)) return new Date(start).toISOString()

  // Heure sans fuseau : on calcule le décalage de Bruxelles à cette date (hiver +1h, été +2h).
  const asUtc = new Date(`${start}Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Brussels', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(asUtc)
  const get = (type: string) => Number(parts.find((x) => x.type === type)!.value)
  const shown = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return new Date(asUtc.getTime() - (shown - asUtc.getTime())).toISOString()
}

function plainText(richText: any[] | undefined): string | null {
  return richText?.map((t) => t.plain_text).join('') || null
}

function blockText(block: any): string {
  return plainText(block[block.type]?.rich_text) ?? ''
}

// --- API Notion (lecture seule) ---

async function notion(path: string, init: RequestInit = {}): Promise<any> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`https://api.notion.com/v1/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${Deno.env.get('NOTION_TOKEN')}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
    })
    if (res.status === 429) {
      // Trop de requêtes : Notion indique combien de secondes attendre.
      await new Promise((r) => setTimeout(r, Number(res.headers.get('retry-after') ?? 1) * 1000))
      continue
    }
    if (!res.ok) throw new Error(`Notion ${res.status} : ${await res.text()}`)
    return res.json()
  }
  throw new Error('Notion : trop de requêtes, réessaie dans une minute')
}

async function queryAllPages(): Promise<any[]> {
  const pages: any[] = []
  let cursor: string | undefined
  do {
    const body = JSON.stringify({ page_size: 100, ...(cursor && { start_cursor: cursor }) })
    const res = await notion(`data_sources/${NOTION_DATA_SOURCE_ID}/query`, { method: 'POST', body })
    pages.push(...res.results)
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return pages
}

// Tous les blocs d'une page, y compris ceux rangés dans des colonnes ou des toggles.
async function listBlocks(blockId: string): Promise<any[]> {
  const blocks: any[] = []
  let cursor: string | undefined
  do {
    const res = await notion(`blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`)
    for (const block of res.results) {
      blocks.push(block)
      if (block.has_children && block.type !== 'child_page' && block.type !== 'child_database') {
        blocks.push(...(await listBlocks(block.id)))
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return blocks
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
