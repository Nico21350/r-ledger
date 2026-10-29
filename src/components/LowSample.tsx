import { MIN_SAMPLE } from '../lib/analysis'

// Pastille « peu fiable » : la stat repose sur moins de MIN_SAMPLE trades.
export function LowSample({ count }: { count: number }) {
  return (
    <span
      className="low-sample"
      title={`Seulement ${count} trade${count > 1 ? 's' : ''} : il en faut au moins ${MIN_SAMPLE} pour que la stat veuille dire quelque chose.`}
    >
      peu fiable
    </span>
  )
}
