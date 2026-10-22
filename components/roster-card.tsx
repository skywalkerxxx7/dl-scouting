import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { ScoutedPlayer } from '@/lib/db/schema'
import { getPlayerReport } from '@/lib/deadlock'
import { fixed, pct } from '@/lib/format'
import { RankBadge } from '@/components/rank-badge'
import { FormStrip } from '@/components/form-strip'
import { cn } from '@/lib/utils'

export async function RosterCard({ player }: { player: ScoutedPlayer }) {
  const report = await getPlayerReport(player.accountId)
  const r = report?.recent

  return (
    <article className="group relative flex flex-col gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={player.avatarUrl ?? ''} alt="" className="size-12 rounded-md bg-muted" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate font-display text-lg uppercase tracking-wide">
            <Link href={`/player/${player.accountId}`} className="after:absolute after:inset-0">
              {report?.profile.personaname ?? player.personaName}
            </Link>
          </h3>
          <span className="font-mono text-xs text-muted-foreground">#{player.accountId}</span>
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
      </div>

      <RankBadge rank={report?.rank ?? null} size="sm" />

      {r && r.matches > 0 ? (
        <>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Win rate" value={pct(r.winRate)} tone={r.winRate >= 0.5 ? 'win' : 'loss'} />
            <Stat label="KDA" value={fixed(r.kda, 2)} />
            <Stat label="Souls/min" value={Math.round(r.soulsPerMin).toLocaleString()} />
          </dl>
          <FormStrip matches={report.matchLog.slice(0, 20)} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No recent matches recorded.</p>
      )}

      {player.notes && <p className="line-clamp-2 border-t border-border pt-3 text-sm text-muted-foreground">{player.notes}</p>}
    </article>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'win' | 'loss' }) {
  return (
    <div className="flex flex-col-reverse rounded-md bg-muted/60 px-2 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={cn('font-mono text-base', tone === 'win' && 'text-win', tone === 'loss' && 'text-loss')}>{value}</dd>
    </div>
  )
}
