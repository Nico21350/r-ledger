import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    // En cas de succès, App détecte la nouvelle session et change d'écran tout seul.
    if (error) setError('E-mail ou mot de passe incorrect.')
    setLoading(false)
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
        <button type="submit" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </motion.form>
    </main>
  )
}
