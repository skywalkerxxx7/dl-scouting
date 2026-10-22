'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { scoutedPlayers } from '@/lib/db/schema'
import { getSteamProfiles } from '@/lib/deadlock'

function assertAccountId(accountId: number) {
  if (!Number.isInteger(accountId) || accountId <= 0 || accountId >= 2 ** 32) {
    throw new Error('Invalid account id')
  }
}

export async function savePlayer(accountId: number) {
  assertAccountId(accountId)
  const [profile] = await getSteamProfiles([accountId])
  if (!profile) throw new Error('Player not found')

  await db
    .insert(scoutedPlayers)
    .values({
      accountId,
      personaName: profile.personaname.slice(0, 64),
      avatarUrl: profile.avatarfull,
      countryCode: profile.countrycode,
    })
    .onConflictDoUpdate({
      target: scoutedPlayers.accountId,
      set: { personaName: profile.personaname.slice(0, 64), avatarUrl: profile.avatarfull, updatedAt: new Date() },
    })

  revalidatePath('/', 'layout')
}

export async function removePlayer(accountId: number) {
  assertAccountId(accountId)
  await db.delete(scoutedPlayers).where(eq(scoutedPlayers.accountId, accountId))
  revalidatePath('/', 'layout')
}

export async function updateNotes(accountId: number, notes: string) {
  assertAccountId(accountId)
  await db
    .update(scoutedPlayers)
    .set({ notes: notes.slice(0, 2000), updatedAt: new Date() })
    .where(eq(scoutedPlayers.accountId, accountId))
  revalidatePath(`/player/${accountId}`)
}
