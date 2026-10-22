import type { Metadata } from 'next'
import Link from 'next/link'
import { getPlayerReport, parseAccountId, type PlayerReport } from '@/lib/deadlock'
import { getRoster } from '@/lib/roster'
import { fixed, int, pct } from '@/lib/format'
import { ComparePicker } from '@/components/compare-picker'
import { RankBadge } from '@/components/rank-badge'
import { RankSparkline } from '@/components/rank-sparkline'
import { FormStrip } from '@/components/form-strip'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Compare players — Patron Scouting' }

type Metric = {
  label: string
  get: (r: PlayerReport) => number
  format: (n: number) => string
  lowerIsBetter?: boolean
}

const GROUPS: { title: string; metrics: Metric[] }[] = [
  {
    title: 'Recent form',
    metrics: [
      { label: 'Win rate', get: (r) => r.recent.winRate, format: pct },
      { label: 'KDA ratio', get: (r) => r.recent.kda, format: (n) => fixed(n, 2) },
      { label: 'Kills / game', get: (r) => r.recent.avgKills, format: fixed },
      { label: 'Deaths / game', get: (r) => r.recent.avgDeaths, format: fixed, lowerIsBetter: true },
      { label: 'Assists / game', get: (r) => r.recent.avgAssists, format: fixed },
      { label: 'Souls / min', get: (r) => r.recent.soulsPerMin, format: int },
      { label: 'Last hits / min', get: (r) => r.recent.lastHitsPerMin, format: (n) => fixed(n, 2) },
      { label: 'Denies / game', get: (r) => r.recent.deniesPerGame, format: fixed },
    ],
  },
  {
    title: 'Lifetime',
    metrics: [
      { label: 'Rank score', get: (r) => r.rank?.score ?? 0, format: (n) => fixed(n, 1) },
      { label: 'Matches', get: (r) => r.lifetime.matches, format: int },
      { label: 'Win rate', get: (r) => r.lifetime.winRate, format: pct },
      { label: 'KDA ratio', get: (r) => r.lifetime.kda, format: (n) => fixed(n, 2) },
      { label: 'Damage / min', get: (r) => r.lifetime.damagePerMin, format: int },
      { label: 'Souls / min', get: (r) => r.lifetime.soulsPerMin, format: int },
      { label: 'Accuracy', get: (r) => r.lifetime.accuracy, format: pct },
      { label: 'Heroes played', get: (r) => r.lifetime.heroesPlayed, format: int },
    ],
  },
]

type Props = { searchParams: Promise<{ a?: string; b?: string }> }

export default async function ComparePage({ searchParams }: Props) {
  const sp = await searchParams
  const aId = sp.a ? parseAccountId(sp.a) : null
  const bId = sp.b ? parseAccountId(sp.b) : null
  const [roster, a, b] = await Promise.all([
    getRoster(),
    aId ? getPlayerReport(aId) : null,
    bId ? getPlayerReport(bId) : null,
  ])

  const options = roster.map((p) => ({ accountId: p.accountId, name: p.personaName }))
  for (const r of [a, b]) {
    if (r && !options.some((o) => o.accountId === r.profile.account_id)) {
      options.push({ accountId: r.profile.account_id, name: r.profile.personaname })
    }
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Head to head</p>
        <h1 className="font-display text-4xl uppercase tracking-wide">Compare players</h1>
      </div>

      <ComparePicker options={options} a={aId} b={bId} />

      {options.length < 2 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Save at least two players from the{' '}
          <Link href="/" className="text-primary underline underline-offset-4">
            scouting board
          </Link>{' '}
          to compare them.
        </p>
      )}

      {a && b && (
        <>
          <section className="grid gap-4 md:grid-cols-2" aria-label="Player summaries">
            <PlayerColumn report={a} side="a" />
            <PlayerColumn report={b} side="b" />
          </section>

          {GROUPS.map((group) => (
            <section key={group.title} aria-labelledby={`g-${group.title}`} className="flex flex-col gap-3">
              <h2 id={`g-${group.title}`} className="font-display text-lg uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h2>
              <div className="divide-y divide-border rounded-lg border border-border bg-card">
                {group.metrics.map((m) => (
                  <MetricRow key={m.label} metric={m} a={a} b={b} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </main>
  )
}

function PlayerColumn({ report, side }: { report: PlayerReport; side: 'a' | 'b' }) {
  const color = side === 'a' ? 'var(--primary)' : 'var(--rival)'
  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-lg border bg-card p-5',
        side === 'a' ? 'border-primary/40' : 'border-rival/40',
      )}
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={report.profile.avatarfull} alt="" className="size-14 rounded-md" />
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/player/${report.profile.account_id}`}
            className={cn(
              'truncate font-display text-2xl uppercase tracking-wide hover:underline',
              side === 'a' ? 'text-primary' : 'text-rival',
            )}
          >
            {report.profile.personaname}
          </Link>
          <span className="font-mono text-xs text-muted-foreground">#{report.profile.account_id}</span>
        </div>
      </div>
      <RankBadge rank={report.rank} />
      <FormStrip matches={report.matchLog.slice(0, 20)} />
      <RankSparkline points={report.rankHistory} color={color} />
      <div className="flex flex-wrap gap-2">
        {report.topHeroes.slice(0, 3).map(
          (h) =>
            h.hero && (
              <span key={h.hero.id} className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.hero.icon} alt="" className="size-5 rounded" />
                {h.hero.name}
                <span className="font-mono text-muted-foreground">{int(h.matches)}</span>
              </span>
            ),
        )}
      </div>
    </article>
  )
}

function MetricRow({ metric, a, b }: { metric: Metric; a: PlayerReport; b: PlayerReport }) {
  const va = metric.get(a)
  const vb = metric.get(b)
  const total = Math.abs(va) + Math.abs(vb) || 1
  const aShare = (Math.abs(va) / total) * 100
  const aBetter = metric.lowerIsBetter ? va < vb : va > vb
  const bBetter = metric.lowerIsBetter ? vb < va : vb > va

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 md:grid-cols-[6rem_1fr_6rem]">
      <span className={cn('text-right font-mono md:text-left', aBetter ? 'text-primary' : 'text-muted-foreground')}>
        {metric.format(va)}
      </span>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{metric.label}</span>
        <div className="hidden h-1.5 w-full overflow-hidden rounded-full bg-muted md:flex" aria-hidden>
          <div className="h-full bg-primary" style={{ width: `${aShare}%` }} />
          <div className="h-full flex-1 bg-rival" />
        </div>
      </div>
      <span className={cn('font-mono md:text-right', bBetter ? 'text-rival' : 'text-muted-foreground')}>
        {metric.format(vb)}
      </span>
    </div>
  )
}
