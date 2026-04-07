FROM cgr.dev/chainguard/wolfi-base@sha256:52e71f61c6afd1f8d2625cff4465d8ecee156668ca665f7e9c582d1cc914eb6a AS base

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Proxy server of Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

ENV NODE_VERSION=24.14.1 \
  NODE_CHECKSUM=sha256:84d38715d449447117d05c3e71acd78daa49d5b1bfa8aacf610303920c3322be

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:e9a3236ebb746bbab93bda4ca842e55a6aaea2c812a685646043e842e69220be
WORKDIR /var/app
ENV NODE_ENV=production \
  PORT=5284

COPY --from=ghcr.io/tarampampam/microcheck@sha256:79c187c05bfa67518078bf4db117771942fa8fe107dc79a905861c75ddf28dfa /bin/httpcheck /usr/bin/httpcheck

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["server.ts"]

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/bin/httpcheck", "http://localhost:5284/health"]
