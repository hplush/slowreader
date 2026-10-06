FROM cgr.dev/chainguard/wolfi-base@sha256:00fd4e9cdd9c5576c336d979fa663f9976f160c456b6ae9fe87e19c4e9c759a2 AS node

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

FROM cgr.dev/chainguard/glibc-dynamic@sha256:82edc253a57efee78d0fb504e11a93b7c74687b1b736110ad3a2a4f3edf632ab

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Proxy server of Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

WORKDIR /var/app
ENV NODE_ENV=production \
  PORT=5284

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/lib/libatomic.so.1 /usr/lib/libatomic.so.1
COPY --from=ghcr.io/tarampampam/microcheck@sha256:c9f79cd408626de7c10f2d487d67339f49adf0ba61dde96ede65343269db1f85 /bin/httpcheck /usr/bin/httpcheck

COPY ./dist/ /var/app/

USER 65532

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["server.ts"]

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/bin/httpcheck", "http://localhost:5284/health"]
