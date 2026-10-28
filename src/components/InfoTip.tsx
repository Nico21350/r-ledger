import { useId } from 'react'

// Petit « i » qui affiche une explication au survol ou au clavier (Tab).
export function InfoTip({ text }: { text: string }) {
  const id = useId()
  return (
    <span className="info-tip">
      <span className="info-tip-icon" tabIndex={0} role="button" aria-describedby={id} aria-label="Explication">
        i
      </span>
      <span className="info-tip-text" role="tooltip" id={id}>
        {text}
      </span>
    </span>
  )
}
