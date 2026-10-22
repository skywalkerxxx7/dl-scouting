'use client'

import { useTransition } from 'react'
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { removePlayer, savePlayer } from '@/app/actions/players'

export function SaveButton({
  accountId,
  saved,
  size = 'default',
}: {
  accountId: number
  saved: boolean
  size?: 'sm' | 'default'
}) {
  const [pending, startTransition] = useTransition()
  const Icon = pending ? Loader2 : saved ? BookmarkCheck : Bookmark

  return (
    <Button
      type="button"
      size={size}
      variant={saved ? 'secondary' : 'default'}
      disabled={pending}
      aria-pressed={saved}
      onClick={() => startTransition(() => (saved ? removePlayer(accountId) : savePlayer(accountId)))}
    >
      <Icon className={pending ? 'animate-spin' : undefined} aria-hidden />
      {saved ? 'Saved' : 'Save'}
    </Button>
  )
}
