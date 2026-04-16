FROM cgr.dev/chainguard/wolfi-base@sha256:1af610c4a70668dad46159ee178b20378c79a49b554f76405670fc442d30183a AS base

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

ENV NODE_VERSION=24.15.0 \
  NODE_CHECKSUM=sha256:472655581fb851559730c48763e0c9d3bc25975c59d518003fc0849d3e4ba0f6

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:e9a3236ebb746bbab93bda4ca842e55a6aaea2c812a685646043e842e69220be
WORKDIR /var/app
ENV NODE_ENV=production \
  LOGUX_HOST=0.0.0.0 \
  LOGUX_LOGGER=json \
  PORT=2554

COPY --from=ghcr.io/tarampampam/microcheck@sha256:79c187c05bfa67518078bf4db117771942fa8fe107dc79a905861c75ddf28dfa /bin/httpcheck /usr/bin/httpcheck

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/
COPY ./web/ /var/web/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--import", "tsx", "index.ts"]

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/bin/httpcheck", "http://localhost:2554/health"]
