import { cn } from '@/lib/utils'

export function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'win' | 'loss' }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn('font-mono text-lg', tone === 'win' && 'text-win', tone === 'loss' && 'text-loss')}>
        {value}
      </span>
    </div>
  )
}
