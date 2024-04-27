# Slow Reader Proxy

HTTP-server to proxy all RSS fetching request from web client.

User could use it to bypass censorship or to try web client before they install upcoming extension (to bypass CORS limit of web app).

_See the [full architecture guide](../README.md) first._

## Scripts

- `cd proxy && pnpm test`: run all proxy tests.
- `cd proxy && pnpm start`: run proxy server.

## Abuse Protection

- Proxy allows only GET requests and HTTP/HTTPS protocols.
- Proxy do not allow requests to in-cloud IP addresses like `127.0.0.1`.
- Proxy removes cookie headers.

## Test Strategy

To test proxy we emulate the real HTTP servers (end-to-end testing).
