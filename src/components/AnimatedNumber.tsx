import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'

// Nombre qui défile jusqu'à sa valeur, et repart de l'ancienne valeur quand elle change (ex. un filtre).
export function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(0)
  const current = useRef(0)

  useEffect(() => {
    if (!Number.isFinite(value)) return
    const controls = animate(current.current, value, {
      duration: reduceMotion ? 0 : 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        current.current = v
        setDisplay(v)
      },
    })
    return () => controls.stop()
  }, [value, reduceMotion])

  return <span className="num">{format(Number.isFinite(value) ? display : value)}</span>
}
