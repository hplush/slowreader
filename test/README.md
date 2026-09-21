# Slow Reader End-to-End Tests

Tests of the deployed app instead of the source code.

## Checks

Check DNS, HTTP, and search engines settings of the deploy:

```sh
pnpm -F test checks
```

- DNS best practices like DNSSEC by NsLookup.io health audit.
- HTTPS DNS record and real HTTP/3 connection.
- HTTP security headers by MDN HTTP Observatory.
- Performance, best practices, and indexing by Google Lighthouse.
- Compression better than gzip.

Add new domains and paths to [`sites.json`](./sites.json).

Copy [`.env.sample`](./.env.sample) to `.env` and put keys there. CI takes them from repository secrets.

CI repeats checks every Monday.
