FROM cgr.dev/chainguard/wolfi-base@sha256:0cff4df29a6597173dc8b813787318150141eb96ac783dc3ff4f5ff52c49a1e2 AS base

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Proxy server of Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

ENV NODE_VERSION=26.1.0 \
  NODE_CHECKSUM=sha256:9fc6f21b6c4a62439727123e510e9c39febb2f563738f4927cd3e0b288c9b3c9

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:d7aa809c1ae88f97cd727d6f5f91e4edab579a14f86f52fd0dd8c658c854286d
WORKDIR /var/app
ENV NODE_ENV=production \
  PORT=5284

COPY --from=ghcr.io/tarampampam/microcheck@sha256:c9f79cd408626de7c10f2d487d67339f49adf0ba61dde96ede65343269db1f85 /bin/httpcheck /usr/bin/httpcheck

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["server.ts"]

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/bin/httpcheck", "http://localhost:5284/health"]
