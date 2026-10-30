import { motion } from 'motion/react'

// Choix exclusif (« Courbe / R par trade ») ; la pastille bleue glisse vers l'option choisie.
export function Segmented<T extends string | number>({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string // identifiant unique de la pastille animée
  label: string
  // disabled : raison pour laquelle l'option n'est pas disponible (affichée au survol).
  options: { value: T; label: string; disabled?: string }[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            className={selected ? 'active' : ''}
            disabled={o.disabled !== undefined}
            title={o.disabled}
            onClick={() => onChange(o.value)}
          >
            {selected && (
              <motion.span
                layoutId={`segmented-${id}`}
                className="segmented-pill"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="segmented-label">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
