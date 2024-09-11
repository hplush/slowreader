# Slow Reader Proxy

HTTP-server to proxy all RSS fetching request from web client.

User could use it to bypass censorship or to try web client before they install upcoming extension (to bypass CORS limit of web app).

[Server](../server/) could use this proxy at `/proxy/*` endpoint.

_See the [full architecture guide](../README.md) first._

## Scripts

- `cd proxy && pnpm test`: run all proxy tests.
- `cd proxy && pnpm start`: run proxy server.
- `cd proxy && pnpm build`: prepare deploy files with production dependencies only.
- `cd proxy && pnpm production`: start production build of the proxy server.

## Abuse Protection

- Allows only GET requests and HTTP/HTTPS protocols.
- Does not allow requests to in-cloud IP addresses like `127.0.0.1`.
- Removes cookie headers.
- Sets user’s IP in `X-Forwarded-For` header.
- Has timeout and response size limit.

## Environment Variables

To run proxy server you must define environment variables:

- `PORT` with HTTP post to listen. It is Google Cloud Run convention.
- `PROXY_ORIGIN` with RegExp for `Origin` header.

Example:

```sh
PORT=8080 PROXY_ORIGIN=^http:\\/\\/localhost:5173$ pnpm start
```

## Deploy

For deploy we:

1. Use `pnpm deploy` to create `dist/` only with production dependencies.
2. Build Docker image with Node.js.
3. Run this image on Google Cloud Run.

We have 2 proxy servers:

- `proxy.slowreader.app` works only for production clients.
- `dev-proxy.slowreader.app` works with staging.
