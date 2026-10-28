import type { Variants } from 'motion/react'

// Apparition commune des cartes et panneaux : légère montée + fondu.
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
}

// Fait apparaître les éléments enfants les uns après les autres.
export const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
