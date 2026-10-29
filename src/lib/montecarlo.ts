// Simulation de Monte-Carlo : on rejoue tes R dans un ordre aléatoire, des centaines de fois,
// pour voir ce qui aurait pu arriver avec exactement les mêmes trades (ou des trades tirés au sort parmi eux).

// melange : mêmes trades, ordre différent. tirage : chaque trade simulé est tiré au sort parmi les tiens.
export type Mode = 'melange' | 'tirage'

export type Simulation = {
  runs: number
  steps: number
  // Pour chaque trade n (0 = départ) : les R cumulés atteints par 5 %, 25 %, 50 %, 75 % et 95 % des simulations.
  bands: { index: number; p5: number; p25: number; p50: number; p75: number; p95: number }[]
  maxDrawdowns: number[] // une valeur par simulation, ≤ 0
  lossStreaks: number[] // plus longue série de pertes de chaque simulation
  finals: number[] // R cumulés à la fin de chaque simulation
}

// Générateur pseudo-aléatoire « mulberry32 » : avec la même graine, les mêmes tirages (utile pour les tests).
export function random(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Valeur sous laquelle se trouve une part p des valeurs triées (p = 0,95 : 95 % des valeurs sont en dessous).
export function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const pos = (sorted.length - 1) * p
  const low = Math.floor(pos)
  const high = Math.ceil(pos)
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low)
}

export function simulate(
  rs: number[],
  { runs = 1000, steps = rs.length, mode = 'melange', seed = 1 }: { runs?: number; steps?: number; mode?: Mode; seed?: number } = {},
): Simulation {
  const rand = random(seed)
  const n = mode === 'melange' ? rs.length : steps
  const paths: Float64Array[] = []
  const maxDrawdowns: number[] = []
  const lossStreaks: number[] = []
  const finals: number[] = []

  for (let run = 0; run < runs; run++) {
    let order: number[]
    if (mode === 'melange') {
      // Mélange de Fisher-Yates : chaque ordre possible a la même chance.
      order = [...rs]
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        const swap = order[i]
        order[i] = order[j]
        order[j] = swap
      }
    } else {
      order = Array.from({ length: n }, () => rs[Math.floor(rand() * rs.length)])
    }
    const path = new Float64Array(n + 1)
    let cum = 0
    let peak = 0
    let maxDd = 0
    let streak = 0
    let longest = 0
    order.forEach((r, i) => {
      cum += r
      path[i + 1] = cum
      peak = Math.max(peak, cum)
      maxDd = Math.min(maxDd, cum - peak)
      // Comme dans la vue d'ensemble, un BE (0 R) interrompt la série.
      streak = r < 0 ? streak + 1 : 0
      longest = Math.max(longest, streak)
    })
    paths.push(path)
    maxDrawdowns.push(maxDd)
    lossStreaks.push(longest)
    finals.push(cum)
  }

  const bands = Array.from({ length: n + 1 }, (_, index) => {
    const values = paths.map((p) => p[index]).sort((a, b) => a - b)
    return {
      index,
      p5: quantile(values, 0.05),
      p25: quantile(values, 0.25),
      p50: quantile(values, 0.5),
      p75: quantile(values, 0.75),
      p95: quantile(values, 0.95),
    }
  })
  return { runs, steps: n, bands, maxDrawdowns, lossStreaks, finals }
}

// Part des simulations qui ont connu au moins `length` pertes d'affilée.
export function streakProbability(sim: Simulation, length: number): number {
  return sim.lossStreaks.filter((s) => s >= length).length / sim.runs
}
