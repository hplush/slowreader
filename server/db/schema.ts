import {
  boolean,
  bytea,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  id: text('id').primaryKey(),
  lastActionAt: timestamp('lastActionAt'),
  passwordHash: text('passwordHash'),
  passwordLockedKey: text('passwordLockedKey')
})

export const sessions = pgTable(
  'sessions',
  {
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    device: text('device').notNull(),
    id: text('id').primaryKey(),
    passkeyId: text('passkeyId'),
    tokenHash: text('tokenHash').notNull().unique('sessionsTokenHashKey'),
    usedAt: timestamp('usedAt').notNull().defaultNow(),
    userId: text('userId')
      .references(() => users.id)
      .notNull()
  },
  table => [index('sessionsUserIdx').on(table.userId)]
)

export const passkeys = pgTable(
  'passkeys',
  {
    aaguid: text('aaguid').notNull(),
    counter: integer('counter').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    id: text('id').primaryKey(),
    lockedKey: text('lockedKey').notNull(),
    name: text('name').notNull(),
    publicKey: bytea('publicKey').notNull(),
    synced: boolean('synced').notNull(),
    transports: text('transports').array().notNull(),
    usedAt: timestamp('usedAt').notNull().defaultNow(),
    userId: text('userId')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
  },
  table => [index('passkeysUserIdx').on(table.userId)]
)

export const challenges = pgTable(
  'challenges',
  {
    challenge: text('challenge').notNull(),
    expiresAt: timestamp('expiresAt').notNull(),
    id: serial('id').primaryKey(),
    type: text('type', {
      enum: ['authentication', 'reauth', 'registration']
    }).notNull(),
    userId: text('userId')
  },
  table => [uniqueIndex('challengesChallengeIdx').on(table.challenge)]
)
