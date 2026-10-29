import { lazy, useEffect, useState } from 'react'
import { Route, Routes } from 'react-router'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { Login } from './components/Login'
import { Layout } from './components/Layout'
import { NotFoundPage } from './pages/NotFoundPage'

// Chaque écran est un fichier JavaScript séparé, téléchargé seulement quand on l'ouvre :
// le premier affichage est plus rapide (découpage du code, « code splitting »).
const OverviewPage = lazy(() => import('./pages/OverviewPage').then((m) => ({ default: m.OverviewPage })))
const AnalysesPage = lazy(() => import('./pages/AnalysesPage').then((m) => ({ default: m.AnalysesPage })))
const GalleryPage = lazy(() => import('./pages/GalleryPage').then((m) => ({ default: m.GalleryPage })))
const TradePage = lazy(() => import('./pages/TradePage').then((m) => ({ default: m.TradePage })))
const ComparePage = lazy(() => import('./pages/ComparePage').then((m) => ({ default: m.ComparePage })))

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
        <Route path="comparer/:a?/:b?" element={<ComparePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
