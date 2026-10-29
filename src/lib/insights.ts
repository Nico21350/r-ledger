import { beEffect, compareAchievable, groupByDimension, MIN_SAMPLE, summarize } from './analysis'
import { DIMENSIONS, type DimensionKey } from './dimensions'
import { quantile, simulate } from './montecarlo'
import { rankSetups, type Setup } from './setups'
import { formatPercent, formatR, type Trade } from './trades'

// Un constat rédigé automatiquement à partir des trades.
export type Insight = {
  id: string
  tone: 'gain' | 'loss' | 'neutral'
  title: string
  text: string
  // Ce qu'un clic sur le constat permet de faire : filtrer, ou aller vers une section de l'écran Analyses.
  filter?: Setup
  section?: string
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

// Critère cité dans une phrase : « Session : NY-2 », « HTF range : H1 » ; pour BUY / SELL, la valeur suffit (« SELL »).
const describe = (key: DimensionKey, value: string) => {
  const label = DIMENSIONS.find((d) => d.key === key)!.label
  return key === 'sens' ? `« ${value} »` : `« ${label} : ${value} »`
}

// L'effet du BE décrit en partie le résultat lui-même (perte évitée, gain manqué) : il ne sert pas de point fort ou faible.
const EXPLANATORY = DIMENSIONS.filter((d) => d.key !== 'pris' && d.key !== 'be')

// Les constats, du plus utile au moins utile. Seuls les groupes d'au moins MIN_SAMPLE trades sont retenus.
export function computeInsights(trades: Trade[], { runs = 500 }: { runs?: number } = {}): Insight[] {
  const all = summarize(trades)
  if (all.count < MIN_SAMPLE || all.avgR === null) return []
  const insights: Insight[] = []

  // Meilleure et pire valeur, toutes colonnes confondues (comparées à l'espérance globale).
  const groups = EXPLANATORY.flatMap((d) =>
    groupByDimension(trades, d)
      // « Not taken » dans Émotions signale un trade non pris, pas une émotion.
      .filter((g) => g.value !== null && g.value !== 'Not taken' && g.reliable && g.count < all.count && g.avgR !== null)
      .map((g) => ({ ...g, key: d.key, value: g.value! })),
  )
  const best = groups.reduce<(typeof groups)[number] | null>((a, g) => (!a || g.avgR! > a.avgR! ? g : a), null)
  const worst = groups.reduce<(typeof groups)[number] | null>((a, g) => (!a || g.avgR! < a.avgR! ? g : a), null)
  if (best && best.avgR! > all.avgR) {
    insights.push({
      id: 'best',
      tone: 'gain',
      title: 'Ton point fort',
      text: `Avec ${describe(best.key, best.value)}, tu fais ${formatR(best.avgR!)} par trade en moyenne (${plural(best.count, 'trade')}), contre ${formatR(all.avgR)} en général.`,
      filter: { [best.key]: best.value },
    })
  }
  if (worst && worst !== best && worst.avgR! < all.avgR) {
    insights.push({
      id: 'worst',
      tone: worst.avgR! < 0 ? 'loss' : 'neutral',
      title: worst.avgR! < 0 ? 'Ce qui te coûte' : 'Ton point faible',
      text: `Avec ${describe(worst.key, worst.value)}, l'espérance tombe à ${formatR(worst.avgR!)} par trade (${plural(worst.count, 'trade')}).`,
      filter: { [worst.key]: worst.value },
    })
  }

  // Meilleure combinaison de deux critères.
  const combo = rankSetups(trades).find((r) => Object.keys(r.setup).length === 2 && r.setup.be === undefined)
  if (combo && combo.avgR !== null && combo.avgR > all.avgR) {
    const parts = (Object.entries(combo.setup) as [DimensionKey, string][]).map(([k, v]) => describe(k, v))
    insights.push({
      id: 'combo',
      tone: 'gain',
      title: 'Meilleur setup',
      text: `${parts.join(' + ')} : ${formatR(combo.avgR)} par trade sur ${plural(combo.count, 'trade')}, ${formatPercent(combo.winRate ?? 0)} gagnants.`,
      filter: combo.setup,
    })
  }

  // Forme récente : les 10 derniers trades comparés à l'ensemble.
  const withR = trades.filter((t) => t.rr_closed !== null)
  if (withR.length >= 20) {
    const recent = summarize(withR.slice(-10))
    const diff = recent.avgR! - all.avgR
    if (Math.abs(diff) >= 0.25) {
      insights.push({
        id: 'form',
        tone: diff > 0 ? 'gain' : 'loss',
        title: diff > 0 ? 'En pleine forme' : 'Passage à vide',
        text: `Sur tes 10 derniers trades, l'espérance est de ${formatR(recent.avgR!)}, ${diff > 0 ? 'au-dessus' : 'en dessous'} de ta moyenne (${formatR(all.avgR)}).`,
      })
    }
  }

  // R laissés sur la table.
  const rr = compareAchievable(trades)
  if (rr.points.length >= MIN_SAMPLE && rr.totalLeft > 0 && rr.captureRate !== null) {
    insights.push({
      id: 'left',
      tone: rr.captureRate >= 0.85 ? 'neutral' : 'loss',
      title: 'Sorties',
      text: `Tu encaisses ${formatPercent(rr.captureRate)} de ce que le marché offrait. Au total, ${formatR(rr.totalLeft).replace('+', '')} sont restés sur la table.`,
      section: 'rr-atteignable',
    })
  }

  // Effet du BE.
  const be = beEffect(trades)
  if (be.prevented.length + be.missed.length > 0) {
    const net = be.savedR - be.missedR
    insights.push({
      id: 'be',
      tone: net > 0 ? 'gain' : net < 0 ? 'loss' : 'neutral',
      title: 'Le stop à BE',
      text:
        net === 0
          ? 'Le stop remonté à BE ne t’a pour l’instant ni fait gagner ni perdre de R.'
          : `Le stop remonté à BE t’a ${net > 0 ? 'fait gagner' : 'coûté'} ${formatR(Math.abs(net)).replace('+', '')} au total (${plural(be.prevented.length, 'perte évitée')}, ${plural(be.missed.length, 'gain manqué')}).`,
      section: 'effet-be',
    })
  }

  // Monte-Carlo : la baisse à laquelle s'attendre.
  const rs = withR.map((t) => t.rr_closed!)
  const sim = simulate(rs, { runs, seed: 42 })
  const badDd = quantile([...sim.maxDrawdowns].sort((a, b) => a - b), 0.05)
  if (badDd < 0) {
    insights.push({
      id: 'drawdown',
      tone: 'neutral',
      title: 'Baisse à prévoir',
      text: `Avec les mêmes trades dans un autre ordre, ta plus forte baisse aurait pu atteindre ${formatR(badDd, 1)} (1 cas sur 20). Ta vraie plus forte baisse est l’une des versions possibles.`,
      section: 'monte-carlo',
    })
  }

  return insights
}
