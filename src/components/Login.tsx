import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DEMO_EMAIL, DEMO_PASSWORD, demoAvailable } from '../lib/demo'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<'form' | 'demo' | null>(null)

  async function signIn(credentials: { email: string; password: string }, source: 'form' | 'demo') {
    setLoading(source)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword(credentials)
    // En cas de succès, App détecte la nouvelle session et change d'écran tout seul.
    // Pour la démo, la raison donnée par Supabase est affichée : elle aide à régler le compte démo.
    if (error) setError(source === 'demo' ? `La démo est indisponible pour le moment (${error.message}).` : 'E-mail ou mot de passe incorrect.')
    setLoading(null)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    signIn({ email, password }, 'form')
  }

  return (
    <main className="center">
      <motion.form
        className="card login-card"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1>
          <span className="brand-mark" aria-hidden="true">R</span> Ledger
        </h1>
        <p className="muted">Journal de trading, en R.</p>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <AnimatePresence>
          {error && (
            <motion.p className="error" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [6, -4, 2, 0] }} exit={{ opacity: 0 }}>
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        <button type="submit" disabled={loading !== null}>
          {loading === 'form' ? 'Connexion…' : 'Se connecter'}
        </button>
        {demoAvailable && (
          <>
            <div className="login-separator">
              <span>ou</span>
            </div>
            <motion.button
              type="button"
              className="demo-button"
              disabled={loading !== null}
              whileHover={{ scale: 1.02 }}
              onClick={() => signIn({ email: DEMO_EMAIL!, password: DEMO_PASSWORD! }, 'demo')}
            >
              {loading === 'demo' ? 'Ouverture de la démo…' : 'Voir la démo'}
            </motion.button>
            <p className="muted small-note">Accès en lecture seule à un vrai journal de trading, sans inscription.</p>
          </>
        )}
      </motion.form>
    </main>
  )
}
