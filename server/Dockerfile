FROM cgr.dev/chainguard/wolfi-base@sha256:fac38d12efdb4bf43ac9e599a31db10a27ad5dd71e5f1618790962eda8d66180 AS node

ENV NODE_VERSION=26.10.0 \
  NODE_CHECKSUM_X64=ca70e9e349de048b9522abb3adc05b3bd6f43c5ffd3ec57916c7da292f59f022

RUN apk add --no-cache curl libatomic

RUN <<EOF
  # Exit immediately if a command fails
  set -euo pipefail

  curl "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    --fail --show-error --location --silent --output /node.tar.xz
  echo "$NODE_CHECKSUM_X64 /node.tar.xz" | sha256sum -c
  mkdir -p /usr/local/bin
  tar -xf /node.tar.xz -C /usr/local/bin --strip-components=2 \
    "node-v${NODE_VERSION}-linux-x64/bin/node"
  rm /node.tar.xz
EOF

FROM cgr.dev/chainguard/glibc-dynamic@sha256:3a06f226c257c2934900ef6a0bff311ceb5fe9df184f6d8159812b2dabb852f9

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

WORKDIR /var/app
ENV NODE_ENV=production \
  LOGUX_HOST=0.0.0.0 \
  LOGUX_LOGGER=json \
  PORT=2554

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/lib/libatomic.so.1 /usr/lib/libatomic.so.1
COPY --from=ghcr.io/tarampampam/microcheck@sha256:c9f79cd408626de7c10f2d487d67339f49adf0ba61dde96ede65343269db1f85 /bin/httpcheck /usr/bin/httpcheck

COPY ./dist/ /var/app/
COPY ./web/ /var/web/

USER 65532

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["index.ts"]

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/bin/httpcheck", "http://localhost:2554/health"]
