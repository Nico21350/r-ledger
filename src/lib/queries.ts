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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades'] }),
  })
}
