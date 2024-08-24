# Slow Reader Server

A small server to sync data between users’ devices.

It is based on top of [Logux Server](https://github.com/logux/server)
and uses end-to-end encryption not to know what users read and like.

## Scripts

- `cd server && pnpm start`: start server in development mode.
- `cd server && pnpm migration`: generate migration based on DB schema changes.

## Database

We are using PostgreSQL database to store credentials and user’s log. For development, we are using [pglite](https://github.com/electric-sql/pglite) to work with PostgreSQL without running a separated DB service. For tests, we are using in-memory pglite.

To use SQL with TypeScript we are using [Drizzle](https://orm.drizzle.team/docs/overview).

To change database schema:

1. Change [`./db/schema.ts`](./db/schema.ts).
2. Run `cd server && pnpm migration` to generate new migration.
3. Restart server. It will apply all new migrations automatically.
