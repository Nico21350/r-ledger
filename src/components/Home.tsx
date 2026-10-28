import { useCallback, useEffect, useState } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Trade } from '../lib/trades'
import { Overview } from './Overview'

type SyncReport = {
  added: number
  updated: number
  unchanged: number
  deleted: number
  imagesAdded: number
  imagesDeleted: number
}

const TRADE_COLUMNS =
  'id, instrument, direction, traded_at, has_time, ny_hour, notion_result, rr_closed, outcome, taken'

export function Home({ email }: { email: string }) {
  const [trades, setTrades] = useState<Trade[] | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [report, setReport] = useState<SyncReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadTrades = useCallback(
    () =>
      supabase
        .from('trades')
        .select(TRADE_COLUMNS)
        .then(({ data, error }) => {
          if (error) setError(error.message)
          else setTrades(data as Trade[])
        }),
    [],
  )

  useEffect(() => {
    loadTrades()
  }, [loadTrades])

  async function handleSync() {
    setSyncing(true)
    setError(null)
    setReport(null)
    const { data, error } = await supabase.functions.invoke<SyncReport>('sync-notion')
    if (error) {
      // La fonction renvoie { error: "..." } : on affiche ce message plutôt qu'un code générique.
      const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null
      setError(body?.error ?? error.message)
    } else {
      setReport(data)
      await loadTrades()
    }
    setSyncing(false)
  }

  return (
    <>
      <header className="topbar">
        <h1>R Ledger</h1>
        <div className="topbar-actions">
          <span className="muted">{email}</span>
          <button onClick={handleSync} disabled={syncing}>
            {syncing ? 'Synchronisation…' : 'Synchroniser'}
          </button>
          <button className="secondary" onClick={() => supabase.auth.signOut()}>
            Se déconnecter
          </button>
        </div>
      </header>

      <main className="page">
        {report && (
          <p className="notice">
            Synchro terminée : {report.added} ajoutés, {report.updated} mis à jour, {report.unchanged} inchangés,{' '}
            {report.deleted} supprimés · {report.imagesAdded} captures téléchargées, {report.imagesDeleted} supprimées.
          </p>
        )}
        {error && <p className="error">{error}</p>}
        {trades ? <Overview trades={trades} /> : <p className="muted">Chargement…</p>}
      </main>
    </>
  )
}
