# Slow Reader Server

A small server to sync data between users’ devices.

It is based on top of [Logux Server](https://github.com/logux/server)
and uses end-to-end encryption not to know what users read and like.

## Project Structure

- [`modules/`](./modules/): separated features of the server.
- [`db/`](./db/): database migrations and configs.
- [`lib/`](./lib/): shared helpers for features.
- [`test/`](./test/): unit tests for each feature.
- [`aaguids/`](./aaguids/): database of passkey providers and scripts to update it.
- [`drizzle.config.ts`](./drizzle.config.ts): config for [Drizzle Kit CLI](https://orm.drizzle.team/docs/kit-overview).
- [`entrypoint.ts`](./entrypoint.ts): start of the [Docker image](../Dockerfile), which runs the app (web client’s nginx with server) or proxy by `ROLE`.

## Scripts

- `pnpm -F server start`: start server in development mode.
- `pnpm -F server migration`: generate migration based on DB schema changes.
- `pnpm -F server database`: see database content.
- `pnpm -F server aaguids`: re-download passkey providers list.

## Environment Variables

- `DATABASE_URL`: PostgreSQL credentials with support of pglite’s `file://` and `memory://` schemas. You must set it when `NODE_ENV=production`.
- `WEB_ORIGIN`: exact origin of the web client like `https://slowreader.app` for CORS and passkeys. Passkeys work only on this domain. You must set it when `NODE_ENV=production`.
- `PROXY_ORIGIN`: enables built-in CORS proxy and specific RegExp to check `Origin` header.
- `PORT`: HTTP post to listen (Google Cloud Run convention).

## End-to-End Types

All HTTP endpoints and [Logux actions](https://logux.org/guide/concepts/action/) are defined in [`api/`](../api/).

It allows us to verify that client and server use the same API.

## Database

We are using PostgreSQL database to store credentials and user’s log. For development, we are using [pglite](https://github.com/electric-sql/pglite) to work with PostgreSQL without running a separated DB service. For tests, we are using in-memory pglite.

Server takes database credentials from `DATABASE_URL` environment variable. In additional to PostgreSQL URL schema, server supports pglite’s `file://` and `memory://`.

To use SQL with TypeScript we are using [Drizzle](https://orm.drizzle.team/docs/overview).

To change database schema:

1. Change [`./db/schema.ts`](./db/schema.ts).
2. Run `pnpm -F server migration` to generate new migration.
3. Restart server. It will apply all new migrations automatically.

You can see local database content by running:

```sh
pnpm -F server database
```

## Log Retention

The log on the server is the user’s backup, not the source of truth: the data itself lives in the SQLite database of every client. The server keeps only encrypted `0` actions and does not know their types.

Clients drive the cleaning:

- When an action stops owning at least one live cell, the client sends `0/clean` with its ID, and the server deletes the row.
- Deletions actions are kept as tombstones. Any device of the user removes the tombstones older than 1 month by the same `0/clean`.

A device, which was offline longer than the retention window, can miss a tombstone and keep the deleted row forever. The server detects it and asks such a client to drop its database and to download everything again by `db/reset`.

## Deploy

Server runs in the [single image](../README.md#deploy) with `ROLE=app` behind web client’s nginx.
