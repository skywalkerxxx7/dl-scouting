import { Suspense } from 'react'
import Link from 'next/link'
import { Columns2, Users } from 'lucide-react'
import { getRoster } from '@/lib/roster'
import { PlayerSearch } from '@/components/player-search'
import { RosterCard } from '@/components/roster-card'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const roster = await getRoster()

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Deadlock scouting board</p>
          <h1 className="text-balance font-display text-4xl uppercase tracking-wide md:text-5xl">
            Find them. Track them. Compare them.
          </h1>
          <p className="max-w-2xl text-pretty text-muted-foreground">
            Look up any player tracked by Statlocker, save them to your board, and keep tabs on rank, form, and hero
            pool before your next scrim.
          </p>
        </div>
        <PlayerSearch savedIds={roster.map((p) => p.accountId)} />
      </section>

      <section aria-labelledby="roster-heading" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h2 id="roster-heading" className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
            <Users className="size-5 text-primary" aria-hidden />
            Saved players
            <span className="font-mono text-base text-muted-foreground">({roster.length})</span>
          </h2>
          {roster.length >= 2 && (
            <Link
              href={`/compare?a=${roster[0].accountId}&b=${roster[1].accountId}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <Columns2 aria-hidden />
              Compare
            </Link>
          )}
        </div>

        {roster.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="font-display text-lg uppercase tracking-wide">Your board is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Search for a player above and hit Save to start scouting.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roster.map((p) => (
              <Suspense key={p.accountId} fallback={<Skeleton className="h-64 rounded-lg" />}>
                <RosterCard player={p} />
              </Suspense>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
