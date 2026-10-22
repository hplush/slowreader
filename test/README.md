# Slow Reader End-to-End Tests

Tests of the deployed app instead of the source code.

CI repeats checks and reproducible build every Wednesday. Reproducible build also runs on every `Dockerfile` change.

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
- TLS certificate is valid for at least 7 more days.

Add new domains and paths to [`sites.json`](./sites.json).

Copy [`.env.sample`](./.env.sample) to `.env` and put keys there. CI takes them from repository secrets.

## Reproducible Build

Build x86 and ARM Docker image twice without cache, like the release does, and check that both builds are the same and run Node.js for their platform:

```sh
pnpm -F test reproducible
```

ARM is built by emulation. Install it first, if your machine is not ARM: `docker run --privileged --rm tonistiigi/binfmt --install arm64`.
