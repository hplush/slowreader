# Slow Reader End-to-End Tests

Tests of the deployed app instead of the source code.

## Checks

Check DNS, HTTP, and search engines settings of the deploy:

```sh
pnpm -F test checks
```

- DNSSEC signature of the domain.
- HTTPS DNS record and real HTTP/3 connection.
- HTTP security headers by MDN HTTP Observatory.
- Compression better than gzip.
- `robots.txt` hiding staging from search engines.

Add new domains and paths to [`sites.json`](./sites.json).

CI repeats checks every Monday.
