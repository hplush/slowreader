# Slow Reader End-to-End Tests

Tests of the deployed app instead of the source code.

## Checks

Check DNS, HTTP, and search engines settings of the deploy:

```sh
pnpm -F test checks
```

- DNS best practices like DNSSEC and `CAA` by [nslookup.io DNS Health Report](https://www.nslookup.io/dns-health/).
- Real HTTP/3 connection with `HTTPS` DNS record by `curl`.
- HTTP security headers by [Mozilla HTTP Observatory](https://developer.mozilla.org/en-US/observatory).
- Performance, best practices, and indexing by [Lighthouse](https://developer.chrome.com/docs/lighthouse) in [PageSpeed Insights](https://pagespeed.web.dev/).
- Brotli or Zstandard compression instead of gzip.

Add new domains and paths to [`sites.json`](./sites.json).

Copy [`.env.sample`](./.env.sample) to `.env` and put keys there. CI takes them from repository secrets.

CI repeats checks every Monday.
