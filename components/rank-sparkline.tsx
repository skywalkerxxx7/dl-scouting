export function RankSparkline({ points, color = 'var(--primary)' }: { points: { t: number; score: number }[]; color?: string }) {
  if (points.length < 2) {
    return <p className="text-sm text-muted-foreground">Not enough ranked matches to chart.</p>
  }
  const w = 300
  const h = 90
  const scores = points.map((p) => p.score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const span = max - min || 1
  const coords = points.map((p, i) => [(i / (points.length - 1)) * w, h - ((p.score - min) / span) * (h - 8) - 4])
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const delta = scores.at(-1)! - scores[0]

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" preserveAspectRatio="none" role="img" aria-label="MMR score over recent ranked matches">
        <polygon points={`0,${h} ${line} ${w},${h}`} fill={color} opacity={0.12} />
        <polyline points={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="flex justify-between text-xs text-muted-foreground">
        <span>Last {points.length} ranked matches</span>
        <span className={delta >= 0 ? 'text-win' : 'text-loss'}>
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(1)} MMR
        </span>
      </figcaption>
    </figure>
  )
}
