'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Option = { accountId: number; name: string }

export function ComparePicker({ options, a, b }: { options: Option[]; a: number | null; b: number | null }) {
  const router = useRouter()
  const go = (na: number | null, nb: number | null) => {
    const params = new URLSearchParams()
    if (na) params.set('a', String(na))
    if (nb) params.set('b', String(nb))
    router.push(`/compare?${params.toString()}`)
  }

  return (
    <div className="flex flex-col items-stretch gap-3 rounded-lg border border-border bg-card p-4 md:flex-row md:items-end">
      <PlayerSelect label="Player A" value={a} options={options} onChange={(v) => go(v, b)} accent="a" />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="self-center"
        onClick={() => go(b, a)}
        aria-label="Swap players"
      >
        <ArrowLeftRight aria-hidden />
      </Button>
      <PlayerSelect label="Player B" value={b} options={options} onChange={(v) => go(a, v)} accent="b" />
    </div>
  )
}

function PlayerSelect({
  label,
  value,
  options,
  onChange,
  accent,
}: {
  label: string
  value: number | null
  options: Option[]
  onChange: (v: number | null) => void
  accent: 'a' | 'b'
}) {
  const id = `select-${accent}`
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn('text-xs uppercase tracking-wider', accent === 'a' ? 'text-primary' : 'text-rival')}
      >
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Select a saved player</option>
        {options.map((o) => (
          <option key={o.accountId} value={o.accountId}>
            {o.name} (#{o.accountId})
          </option>
        ))}
      </select>
    </div>
  )
}
