import { bigint, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const scoutedPlayers = pgTable('scouted_players', {
  accountId: bigint('account_id', { mode: 'number' }).primaryKey(),
  personaName: text('persona_name').notNull(),
  avatarUrl: text('avatar_url'),
  countryCode: text('country_code'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ScoutedPlayer = typeof scoutedPlayers.$inferSelect
