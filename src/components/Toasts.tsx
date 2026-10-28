import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export type ToastItem = { id: number; kind: 'success' | 'error'; title: string; text: string }

const DURATION_MS = 7000

// Notifications en bas à droite : elles glissent à l'écran puis disparaissent seules.
export function Toasts({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {items.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), DURATION_MS)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <motion.div
      layout
      className={`toast ${toast.kind}`}
      role={toast.kind === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
    >
      <span className="toast-icon" aria-hidden="true">
        {toast.kind === 'success' ? '✓' : '!'}
      </span>
      <div>
        <strong>{toast.title}</strong>
        <p>{toast.text}</p>
      </div>
      <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Fermer">
        ✕
      </button>
      {/* Barre qui se vide pendant que la notification reste affichée. */}
      <motion.span
        className="toast-progress"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: DURATION_MS / 1000, ease: 'linear' }}
      />
    </motion.div>
  )
}
