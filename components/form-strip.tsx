import type { RecentMatch } from '@/lib/deadlock'
import { cn } from '@/lib/utils'

export function FormStrip({ matches }: { matches: RecentMatch[] }) {
  const wins = matches.filter((m) => m.win).length
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Last {matches.length} form</span>
        <span>
          {wins}W {matches.length - wins}L
        </span>
      </div>
      <ol className="flex gap-0.5" aria-label={`${wins} wins and ${matches.length - wins} losses, most recent first`}>
        {matches.map((m) => (
          <li key={m.matchId} className={cn('h-2 flex-1 rounded-sm', m.win ? 'bg-win' : 'bg-loss/70')} />
        ))}
      </ol>
    </div>
  )
}
