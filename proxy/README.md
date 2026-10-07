# Slow Reader Proxy

HTTP-server to proxy all RSS fetching request from web client.

User could use it to bypass censorship or to try web client before they install upcoming extension (to bypass CORS limit of web app).

[Server](../server/) could use this proxy at `/proxy/*` endpoint.

_See the [full architecture guide](../README.md) first._

## Scripts

- `pnpm -F proxy test`: run all proxy tests.
- `pnpm -F proxy start`: run proxy server.

## Abuse Protection

- Allows only GET requests and HTTP/HTTPS protocols.
- Does not allow requests to in-cloud IP addresses like `127.0.0.1`.
- Checks the address after DNS, so no hostname can point us to in-cloud IP addresses.
- Sends only the few headers a feed needs, and drops everything else.
- Sends constant `User-Agent: SlowReader/1.0 (+https://slowreader.app)`.
- Loads one URL per host at a time, with a delay between requests.
- Limits requests per IP and requests in parallel.
- Marks answers with `nosniff` and `Content-Security-Policy: sandbox` to avoid reading our cookie by proxy’s content if user will be forced to open proxied URL in the browser.
- Has timeout to answer, idle timeout while streaming body, and response size limit, counted while streaming.

## Performance

- Caches DNS answers and keeps connections to feed hosts alive.
- Keeps responses in memory, while the feed’s `Cache-Control` allows it.
- Passes compressed bodies as they came, without unpacking them.

## Environment Variables

To run proxy server you must define environment variables:

- `PORT` with HTTP post to listen. It is Google Cloud Run convention.
- `PROXY_ORIGIN` with RegExp for `Origin` header.
- `BEHIND_BALANCER` (optional) to take client’s IP from `X-Forwarded-For`, when proxy works behind our balancer.

Example:

```sh
PORT=8080 PROXY_ORIGIN=^http:\\/\\/localhost:5173$ pnpm start
```

## Deploy

Proxy runs in the [single image](../README.md#parts) with `ROLE=proxy` on a separated domain, so proxied content can’t access the app’s storage and the server can’t link feed URLs to the user’s account.
