import { useCallback, useEffect, useState } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type SyncReport = {
  added: number
  updated: number
  unchanged: number
  deleted: number
  imagesAdded: number
  imagesDeleted: number
}

export function Home({ email }: { email: string }) {
  const [tradeCount, setTradeCount] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [report, setReport] = useState<SyncReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadCount = useCallback(
    () =>
      supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .then(({ count, error }) => {
          if (error) setError(error.message)
          else setTradeCount(count)
        }),
    [],
  )

  useEffect(() => {
    loadCount()
  }, [loadCount])

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
      await loadCount()
    }
    setSyncing(false)
  }

  return (
    <main className="center">
      <section className="card">
        <header className="row">
          <h1>R Ledger</h1>
          <button className="secondary" onClick={() => supabase.auth.signOut()}>
            Se déconnecter
          </button>
        </header>
        <p className="muted">Connecté : {email}</p>

        <p className="big">{tradeCount ?? '…'}</p>
        <p className="muted">trades dans Supabase</p>

        <button onClick={handleSync} disabled={syncing}>
          {syncing ? 'Synchronisation…' : 'Synchroniser'}
        </button>

        {report && (
          <ul className="report">
            <li>{report.added} ajoutés</li>
            <li>{report.updated} mis à jour</li>
            <li>{report.unchanged} inchangés</li>
            <li>{report.deleted} supprimés</li>
            <li>{report.imagesAdded} captures téléchargées</li>
            <li>{report.imagesDeleted} captures supprimées</li>
          </ul>
        )}
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  )
}
