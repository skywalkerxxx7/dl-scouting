'use client'

import { useDeferredValue, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SaveButton } from '@/components/save-button'

type Result = { accountId: number; name: string; avatar: string; country: string | null }

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<Result[]>)

export function PlayerSearch({ savedIds }: { savedIds: number[] }) {
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query.trim())
  const { data, isLoading } = useSWR(
    deferred.length >= 2 ? `/api/search?q=${encodeURIComponent(deferred)}` : null,
    fetcher,
    { keepPreviousData: true },
  )
  const saved = new Set(savedIds)

  return (
    <section aria-labelledby="search-heading" className="flex flex-col gap-3">
      <h2 id="search-heading" className="sr-only">
        Search players
      </h2>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, account ID, SteamID64, or paste a Statlocker profile URL"
          aria-label="Search players"
          className="h-12 pl-10 text-base"
        />
      </div>

      {deferred.length >= 2 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {isLoading && !data ? (
            <ul className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="size-9 rounded-md" />
                  <Skeleton className="h-4 w-40" />
                </li>
              ))}
            </ul>
          ) : data && data.length > 0 ? (
            <ul className="divide-y divide-border">
              {data.map((p) => (
                <li key={p.accountId} className="flex items-center gap-3 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.avatar} alt="" className="size-9 rounded-md" />
                  <Link href={`/player/${p.accountId}`} className="flex min-w-0 flex-1 flex-col hover:underline">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      #{p.accountId}
                      {p.country ? ` · ${p.country}` : ''}
                    </span>
                  </Link>
                  <SaveButton accountId={p.accountId} saved={saved.has(p.accountId)} size="sm" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No Deadlock players found for “{deferred}”.</p>
          )}
        </div>
      )}
    </section>
  )
}
