# Slow Reader Proxy

HTTP-server to proxy all RSS fetching request from web client.

User could use it to bypass censorship or to try web client before they install upcoming extension (to bypass CORS limit of web app).

_See the [full architecture guide](../README.md) first._

## Scripts

- `cd proxy && pnpm test`: run all proxy tests.
- `cd proxy && pnpm start`: run proxy server.
- `cd proxy && pnpm build`: prepare single JS file of the proxy server.
- `cd proxy && pnpm production`: start production build of the proxy server.

## Abuse Protection

- Proxy allows only GET requests and HTTP/HTTPS protocols.
- Proxy do not allow requests to in-cloud IP addresses like `127.0.0.1`.
- Proxy removes cookie headers.
- Proxy set user’s IP in `X-Forwarded-For` header.
- Proxy has timeout and response size limit.
- Proxy has rate limit. The rate limiting is implemented using an in-memory map to track the number of requests made from each IP address to each domain and globally.

## Test Strategy

To test proxy we emulate the real HTTP servers (end-to-end testing).

## Deploy

For deploy we:

1. Use `esbuild` to compile TS to JS and bundle all dependencies to a single JS file. Bundling allows us to put only necessary dependencies into the server.
2. Build Docker image with Node.js.
3. Run this image on Google Cloud Run.

We have 2 proxy servers:

- `proxy.slowreader.app` works only for production clients.
- `dev-proxy.slowreader.app` works with staging and PR previews.
