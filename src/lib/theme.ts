// Couleurs du thème lues dans index.css, pour que les graphiques suivent les mêmes variables.
export function themeColors() {
  const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return {
    black: css('--black'),
    navy: css('--navy'),
    grid: css('--navy-light'),
    electric: css('--electric'),
    text: css('--text'),
    muted: css('--muted'),
    gain: css('--gain'),
    loss: css('--loss'),
  }
}
