import type { RankInfo } from '@/lib/deadlock'
import { cn } from '@/lib/utils'

export function RankBadge({ rank, size = 'md' }: { rank: RankInfo | null; size?: 'sm' | 'md' }) {
  if (!rank) {
    return <span className="text-xs uppercase tracking-wider text-muted-foreground">Unranked</span>
  }
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={rank.image}
        alt=""
        className={cn('object-contain', size === 'sm' ? 'size-7' : 'size-10')}
        loading="lazy"
      />
      <span className="flex flex-col leading-tight">
        <span
          className={cn('font-display uppercase tracking-wider', size === 'sm' ? 'text-sm' : 'text-base')}
          style={{ color: rank.color }}
        >
          {rank.name} {rank.subrank > 0 ? rank.subrank : ''}
        </span>
        {size === 'md' && <span className="text-xs text-muted-foreground">MMR score {rank.score.toFixed(1)}</span>}
      </span>
    </span>
  )
}
