# Slow Reader Proxy

HTTP-server to proxy all RSS fetching request from web client.

User could use it to bypass censorship or to try web client before they install upcoming extension (to bypass CORS limit of web app).

[Server](../server/) could use this proxy at `/proxy/*` endpoint.

_See the [full architecture guide](../README.md) first._

## Scripts

- `pnpm -F proxy test`: run all proxy tests.
- `pnpm -F proxy start`: run proxy server.
- `pnpm -F proxy build`: prepare deploy files with production dependencies only.
- `pnpm -F proxy production`: start production build of the proxy server.

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
3. Run this image on our [cloud server](https://github.com/hplush/cloud).

We have 2 proxy servers:

- `proxy.slowreader.app` works only for production clients.
- `proxy.dev.slowreader.app` works with staging.
