import {
  boolean,
  customType,
  index,
  integer,
  pgSequence,
  pgTable,
  serial,
  text,
  timestamp
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  id: text('id').primaryKey(),
  passwordHash: text('passwordHash')
})

export const sessions = pgTable(
  'sessions',
  {
    clientId: text('clientId'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    id: serial('id').primaryKey(),
    token: text('token').notNull(),
    usedAt: timestamp('usedAt').notNull().defaultNow(),
    userId: text('userId')
      .references(() => users.id)
      .notNull()
  },
  table => [index('sessionsUserIdx').on(table.userId)]
)

const bytea = customType<{ data: Buffer; default: false; notNull: false }>({
  dataType() {
    return 'bytea'
  }
})

export const actionsAdded = pgSequence('actionsAdded')

export const actions = pgTable('actions', {
  added: integer('added').notNull(),
  compressed: boolean('compressed').notNull(),
  encrypted: bytea('encrypted').notNull(),
  id: text('id').primaryKey(),
  iv: bytea('iv').notNull(),
  subprotocol: integer('subprotocol').notNull(),
  time: integer('time').notNull(),
  userId: text('userId')
    .references(() => users.id)
    .notNull()
})
