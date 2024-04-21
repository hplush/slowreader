# Slow Reader Proxy

HTTP-server to proxy all RSS fetching request from web client.

User could use it to bypass censorship or to try web client before they install upcoming extension (to bypass CORS limit of web app).

## Scripts

### Start Proxy

```sh
pnpm start
# // Proxy server running on port 5284
```

## Abuse Protection

- Proxy allows only GET requests
- Proxy do not allow requests to in-cloud ip addresses like `127.0.0.1`
- Proxy allows only HTTP or HTTPS protocols
- Proxy removes cookie headers

## Test Strategy

To test proxy we emulate the real HTTP servers (end-to-end testing).
