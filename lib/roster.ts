import 'server-only'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { scoutedPlayers } from '@/lib/db/schema'

export async function getRoster() {
  return db.select().from(scoutedPlayers).orderBy(desc(scoutedPlayers.createdAt))
}

export async function getScouted(accountId: number) {
  const [row] = await db.select().from(scoutedPlayers).where(eq(scoutedPlayers.accountId, accountId))
  return row ?? null
}
