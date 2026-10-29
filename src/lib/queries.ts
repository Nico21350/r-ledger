import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Les trades sont chargés une seule fois, puis gardés en mémoire (cache) pour tous les écrans.
export function useTrades() {
  return useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const { data, error } = await supabase.from('trades').select('*').order('traded_at')
      if (error) throw error
      return data
    },
  })
}

// Une capture TradingView d'un trade, avec un lien temporaire pour l'afficher.
export type Capture = { id: string; tradeId: string; position: number; url: string }

// Durée de validité des liens vers les captures (le Storage est privé : chaque lien est signé et expire).
const SIGNED_URL_SECONDS = 60 * 60

// Toutes les captures, rangées par trade et dans l'ordre de la page Notion.
export function useCaptures() {
  return useQuery({
    queryKey: ['captures'],
    // Les liens expirent après une heure : on les redemande un peu avant.
    staleTime: (SIGNED_URL_SECONDS - 10 * 60) * 1000,
    refetchInterval: (SIGNED_URL_SECONDS - 10 * 60) * 1000,
    queryFn: async () => {
      const { data: rows, error } = await supabase.from('trade_images').select('*').order('position')
      if (error) throw error
      if (rows.length === 0) return new Map<string, Capture[]>()
      const { data: signed, error: signError } = await supabase.storage
        .from('captures')
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          SIGNED_URL_SECONDS,
        )
      if (signError) throw signError
      const urls = new Map(signed.map((s) => [s.path, s.signedUrl]))
      const byTrade = new Map<string, Capture[]>()
      for (const r of rows) {
        const url = urls.get(r.storage_path)
        if (!url) continue
        const list = byTrade.get(r.trade_id) ?? []
        list.push({ id: r.id, tradeId: r.trade_id, position: r.position, url })
        byTrade.set(r.trade_id, list)
      }
      return byTrade
    },
  })
}

export type SyncReport = {
  added: number
  updated: number
  unchanged: number
  deleted: number
  imagesAdded: number
  imagesDeleted: number
}

// Lance la fonction sync-notion ; une fois terminée, le cache des trades est rechargé.
export function useSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<SyncReport>('sync-notion')
      if (error) {
        // La fonction renvoie { error: "..." } : on affiche ce message plutôt qu'un code générique.
        const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null
        throw new Error(body?.error ?? error.message)
      }
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['captures'] })
    },
  })
}
