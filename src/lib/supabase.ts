import { createClient } from '@supabase/supabase-js'

// Valeurs lues dans .env. Seules les variables VITE_ arrivent dans le navigateur.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY manquant dans .env')
}

export const supabase = createClient(url, key)
