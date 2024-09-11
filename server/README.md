# Slow Reader Server

A small server to sync data between users’ devices.

It is based on top of [Logux Server](https://github.com/logux/server)
and uses end-to-end encryption not to know what users read and like.

## Project Structure

- [`modules/`](./modules/): separated features of the server.
- [`db/`](./db/): database migrations and configs.
- [`lib/`](./lib/): shared helpers for features.
- [`test/`](./test/): unit tests for each feature.
- [`scripts/`](./scripts/): script to test production mode.
- [`drizzle.config.ts`](./drizzle.config.ts): config for [Drizzle Kit CLI](https://orm.drizzle.team/kit-docs/overview).
- [`Dockerfile`](./Dockerfile): build image to deploy server.

## Scripts

- `cd server && pnpm start`: start server in development mode.
- `cd server && pnpm migration`: generate migration based on DB schema changes.
- `cd server && pnpm build`: prepare deploy files with production dependencies only.
- `cd server && pnpm production`: start production build of the server.

## Environment Variables

- `DATABASE_URL`: PostgreSQL credentials with support of pglite’s `file://` and `memory://` schemas. You must set it when `NODE_ENV=production`.
- `PROXY_ORIGIN`: enables built-in CORS proxy and specific RegExp to check `Origin` header.
- `ASSETS`: enables serving web client assets from `../web`.
- `PORT`: HTTP post to listen (Google Cloud Run convention).

## End-to-End Types

All HTTP endpoints and [Logux actions](https://logux.org/guide/concepts/action/) are defined in [`api/`](../api/).

It allows us to verify that client and server use the same API.

## One Server Mode

On staging and production server we have separated servers for [CORS proxy](../proxy/) and [serving web client assets](../web/nginx.conf) because of performance and attack surface reasons.

But for pull request preview and self-hosted you can use this server for everything. With pglite it allows user to have the single Docker image for the whole app.

- To enable CORS proxy user need to specify `PROXY_ORIGIN` environment variable with `Origin` RegExp.
- To server web client assets user need to set `ASSETS=1`. The server will get assets from `../web`.
- `DATABASE_URL` should be set to pglite’s folder.

Example:

```sh
PROXY_ORIGIN=^http:\\/\\/localhost:5173$ ASSETS=1 DATABASE_URL=file://./db/pgdata pnpm start
```

## Database

We are using PostgreSQL database to store credentials and user’s log. For development, we are using [pglite](https://github.com/electric-sql/pglite) to work with PostgreSQL without running a separated DB service. For tests, we are using in-memory pglite.

Server takes database credentials from `DATABASE_URL` environment variable. In additional to PostgreSQL URL schema, server supports pglite’s `file://` and `memory://`.

To use SQL with TypeScript we are using [Drizzle](https://orm.drizzle.team/docs/overview).

To change database schema:

1. Change [`./db/schema.ts`](./db/schema.ts).
2. Run `cd server && pnpm migration` to generate new migration.
3. Restart server. It will apply all new migrations automatically.

## Deploy

For deploy we:

1. Use `pnpm deploy` to create `dist/` only with production dependencies.
2. Build Docker image with Node.js.
3. Run this image on Google Cloud Run.

We deploy server to:
- `server.slowreader.app` for production.
- `dev-proxy.slowreader.app` for staging.
- Temporary Google’s domain for pull request preview.
