import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { Login } from './components/Login'
import { Layout } from './components/Layout'
import { OverviewPage } from './pages/OverviewPage'
import { AnalysesPage } from './pages/AnalysesPage'
import { GalleryPage } from './pages/GalleryPage'
import { TradePage } from './pages/TradePage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  // undefined = on ne sait pas encore si une session existe, null = pas connecté.
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  // Pas connecté : l'écran de connexion s'affiche à n'importe quelle adresse,
  // puis on reste sur cette adresse une fois connecté (un lien partagé fonctionne donc).
  if (!session) return <Login />

  return (
    <Routes>
      <Route element={<Layout email={session.user.email ?? ''} />}>
        <Route index element={<OverviewPage />} />
        <Route path="analyses" element={<AnalysesPage />} />
        <Route path="galerie" element={<GalleryPage />} />
        <Route path="trade/:id" element={<TradePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
