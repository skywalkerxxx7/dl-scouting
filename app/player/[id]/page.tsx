import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Columns2, ExternalLink } from 'lucide-react'
import { getPlayerReport, parseAccountId, RECENT_WINDOW, statlockerUrl } from '@/lib/deadlock'
import { getRoster, getScouted } from '@/lib/roster'
import { fixed, int, pct, timeAgo } from '@/lib/format'
import { RankBadge } from '@/components/rank-badge'
import { SaveButton } from '@/components/save-button'
import { NotesEditor } from '@/components/notes-editor'
import { RankSparkline } from '@/components/rank-sparkline'
import { FormStrip } from '@/components/form-strip'
import { StatTile } from '@/components/stat-tile'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseAccountId((await params).id)
  const report = id ? await getPlayerReport(id) : null
  return { title: report ? `${report.profile.personaname} — Patron Scouting` : 'Player — Patron Scouting' }
}

export default async function PlayerPage({ params }: Props) {
  const accountId = parseAccountId((await params).id)
  if (!accountId) notFound()
  const [report, scouted, roster] = await Promise.all([getPlayerReport(accountId), getScouted(accountId), getRoster()])
  if (!report) notFound()

  const { profile, recent, lifetime } = report
  const rival = roster.find((p) => p.accountId !== accountId)

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <section className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6 md:flex-row md:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={profile.avatarfull} alt="" className="size-24 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <h1 className="font-display text-3xl uppercase tracking-wide md:text-4xl">{profile.personaname}</h1>
          <p className="font-mono text-sm text-muted-foreground">
            Account #{accountId}
            {profile.countrycode ? ` · ${profile.countrycode}` : ''}
          </p>
          <RankBadge rank={report.rank} />
        </div>
        <div className="flex flex-wrap gap-2">
          <SaveButton accountId={accountId} saved={Boolean(scouted)} />
          <a
            href={statlockerUrl(accountId)}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            Statlocker
            <ExternalLink aria-hidden />
          </a>
          <Link
            href={`/compare?a=${accountId}${rival ? `&b=${rival.accountId}` : ''}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            <Columns2 aria-hidden />
            Compare
          </Link>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <section aria-labelledby="recent-heading" className="flex flex-col gap-4">
            <SectionTitle id="recent-heading">Recent form · last {recent.matches || RECENT_WINDOW} matches</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Win rate" value={pct(recent.winRate)} tone={recent.winRate >= 0.5 ? 'win' : 'loss'} />
              <StatTile label="KDA ratio" value={fixed(recent.kda, 2)} />
              <StatTile
                label="Avg K / D / A"
                value={`${fixed(recent.avgKills)} / ${fixed(recent.avgDeaths)} / ${fixed(recent.avgAssists)}`}
              />
              <StatTile label="Souls / min" value={int(recent.soulsPerMin)} />
              <StatTile label="Last hits / min" value={fixed(recent.lastHitsPerMin, 2)} />
              <StatTile label="Denies / game" value={fixed(recent.deniesPerGame)} />
              <StatTile label="Avg match" value={`${fixed(recent.avgDurationMin, 0)} min`} />
              <StatTile label="Matches" value={int(recent.matches)} />
            </div>
            {report.matchLog.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <FormStrip matches={report.matchLog} />
              </div>
            )}
          </section>

          <section aria-labelledby="lifetime-heading" className="flex flex-col gap-4">
            <SectionTitle id="lifetime-heading">Lifetime</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Matches" value={int(lifetime.matches)} />
              <StatTile label="Win rate" value={pct(lifetime.winRate)} tone={lifetime.winRate >= 0.5 ? 'win' : 'loss'} />
              <StatTile label="KDA ratio" value={fixed(lifetime.kda, 2)} />
              <StatTile label="Hours played" value={int(lifetime.hoursPlayed)} />
              <StatTile label="Damage / min" value={int(lifetime.damagePerMin)} />
              <StatTile label="Souls / min" value={int(lifetime.soulsPerMin)} />
              <StatTile label="Accuracy" value={pct(lifetime.accuracy)} />
              <StatTile label="Heroes played" value={int(lifetime.heroesPlayed)} />
            </div>
          </section>

          <section aria-labelledby="log-heading" className="flex flex-col gap-4">
            <SectionTitle id="log-heading">Match log</SectionTitle>
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 font-medium">Hero</th>
                    <th className="px-4 py-3 font-medium">Result</th>
                    <th className="px-4 py-3 font-medium">K / D / A</th>
                    <th className="px-4 py-3 text-right font-medium">Souls</th>
                    <th className="px-4 py-3 text-right font-medium">Length</th>
                    <th className="px-4 py-3 text-right font-medium">Played</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.matchLog.slice(0, 15).map((m) => (
                    <tr key={m.matchId}>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          {m.hero && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.hero.icon} alt="" className="size-7 rounded" loading="lazy" />
                          )}
                          {m.hero?.name ?? 'Unknown'}
                        </span>
                      </td>
                      <td className={cn('px-4 py-2.5 font-medium', m.win ? 'text-win' : 'text-loss')}>
                        {m.win ? 'Win' : 'Loss'}
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        {m.kills} / {m.deaths} / {m.assists}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{int(m.netWorth)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{fixed(m.durationMin, 0)}m</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{timeAgo(m.startTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.matchLog.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No matches recorded for this player.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-8">
          <section aria-labelledby="mmr-heading" className="flex flex-col gap-4">
            <SectionTitle id="mmr-heading">Rank trend</SectionTitle>
            <div className="rounded-lg border border-border bg-card p-4">
              <RankSparkline points={report.rankHistory} />
            </div>
          </section>

          <section aria-labelledby="heroes-heading" className="flex flex-col gap-4">
            <SectionTitle id="heroes-heading">Hero pool</SectionTitle>
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
              {report.topHeroes.map((h, i) => (
                <li key={h.hero?.id ?? i} className="flex items-center gap-3 p-3">
                  {h.hero && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.hero.icon} alt="" className="size-10 rounded-md bg-muted" loading="lazy" />
                  )}
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium">{h.hero?.name ?? 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">
                      {int(h.matches)} matches · {fixed(h.kda, 2)} KDA
                    </span>
                  </div>
                  <span className={cn('font-mono text-sm', h.winRate >= 0.5 ? 'text-win' : 'text-loss')}>
                    {pct(h.winRate)}
                  </span>
                </li>
              ))}
              {report.topHeroes.length === 0 && <li className="p-3 text-sm text-muted-foreground">No hero data.</li>}
            </ul>
          </section>

          {scouted && (
            <section aria-labelledby="notes-heading" className="flex flex-col gap-4">
              <SectionTitle id="notes-heading">Scouting notes</SectionTitle>
              <NotesEditor accountId={accountId} initialNotes={scouted.notes} />
            </section>
          )}
        </aside>
      </div>
    </main>
  )
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-display text-lg uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  )
}
