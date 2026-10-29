// Couleurs du thème lues dans index.css, pour que les graphiques suivent les mêmes variables.
export function themeColors() {
  const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return {
    black: css('--black'),
    navy: css('--navy'),
    grid: css('--navy-light'),
    electric: css('--electric'),
    violet: css('--violet'),
    text: css('--text'),
    muted: css('--muted'),
    gain: css('--gain'),
    loss: css('--loss'),
  }
}

// Couleur d'une case (carte de chaleur, calendrier) : vert pour un R positif, rouge pour un R négatif,
// d'autant plus vive que la valeur est grande par rapport à la plus grande valeur affichée.
// En RGB (et non en variables CSS) pour que les animations puissent passer d'une couleur à l'autre.
const NAVY_RGB = [11, 23, 48]
const GAIN_RGB = [34, 197, 94]
const LOSS_RGB = [239, 68, 68]

export function heatColor(value: number, maxAbs: number): string {
  if (value === 0 || maxAbs === 0) return 'rgb(30, 41, 66)'
  const strength = 0.2 + 0.75 * Math.min(1, Math.abs(value) / maxAbs)
  const target = value > 0 ? GAIN_RGB : LOSS_RGB
  const mix = NAVY_RGB.map((c, i) => Math.round(c + (target[i] - c) * strength))
  return `rgb(${mix.join(', ')})`
}
