'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { updateNotes } from '@/app/actions/players'

export function NotesEditor({ accountId, initialNotes }: { accountId: number; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes)
  const [savedNotes, setSavedNotes] = useState(initialNotes)
  const [pending, startTransition] = useTransition()
  const dirty = notes !== savedNotes

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          await updateNotes(accountId, notes)
          setSavedNotes(notes)
        })
      }}
    >
      <label htmlFor="notes" className="sr-only">
        Scouting notes
      </label>
      <Textarea
        id="notes"
        value={notes}
        maxLength={2000}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Playstyle, lane habits, comfort picks, ban targets..."
        className="min-h-32"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{dirty ? 'Unsaved changes' : 'Saved'}</span>
        <Button type="submit" size="sm" disabled={!dirty || pending}>
          {pending ? 'Saving...' : 'Save notes'}
        </Button>
      </div>
    </form>
  )
}
