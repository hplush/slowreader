# Single image for the app (web client with server) and proxy. ROLE environment
# variable chooses what to run, see server/entrypoint.ts.
#
# Every part is installed and built in its own stage with only its own
# dependencies, so a malicious web dependency can’t change the server code.

# cgr.dev/chainguard/wolfi-base:latest
FROM cgr.dev/chainguard/wolfi-base@sha256:bc76fa39ddd1482dd56a761b3331e03ba8f0e093ebb525618a56d014b480da88 AS base

ARG TARGETARCH

ENV NODE_VERSION=26.12.1 \
  NODE_CHECKSUM_X64=6170b2d474e1c626f43cff3adc118df9fe3b573258a4fc3d850c8dbc6b079bbd \
  NODE_CHECKSUM_ARM64=42aa04922591ee5d4dbc7740d452621acf28508239daa512f5ee8c47ee224fdb \
  PNPM_VERSION=12.15.0 \
  PNPM_CHECKSUM_X64=55b5ed0092bd11176c1669598e231ae52e7cedac59de6efd0d415730f37d0598 \
  PNPM_CHECKSUM_ARM64=d7ce93a2c7d847d3a34bd3f559b60c14f578b1320c17cc352a2c5c5fdf956117

# Exact versions to get the same libraries in every build
RUN apk add --no-cache curl libatomic=16.2.0-r1 libstdc++=16.2.0-r1

RUN <<EOF
  # Exit immediately if a command fails
  set -euo pipefail

  if [ "$TARGETARCH" = "amd64" ]; then
    export NODE_ARCH="x64"
    export NODE_CHECKSUM=$NODE_CHECKSUM_X64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_X64
  elif [ "$TARGETARCH" = "arm64" ]; then
    export NODE_ARCH="arm64"
    export NODE_CHECKSUM=$NODE_CHECKSUM_ARM64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_ARM64
  else
    echo "Unsupported architecture: $TARGETARCH"
    exit 1
  fi

  curl "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    --fail --show-error --location --silent --output /node.tar.xz
  echo "$NODE_CHECKSUM /node.tar.xz" | sha256sum -c
  mkdir -p /usr/local/bin
  tar -xf /node.tar.xz -C /usr/local/bin --strip-components=2 \
    "node-v${NODE_VERSION}-linux-${NODE_ARCH}/bin/node"
  rm /node.tar.xz

  curl "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-${NODE_ARCH}.tar.gz" \
    --fail --show-error --location --silent --output /pnpm.tar.gz
  echo "$PNPM_CHECKSUM /pnpm.tar.gz" | sha256sum -c
  mkdir -p /usr/local/share/pnpm
  tar -xz -f /pnpm.tar.gz -C /usr/local/share/pnpm
  ln -s /usr/local/share/pnpm/pnpm /usr/local/bin/pnpm
  rm /pnpm.tar.gz
EOF

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
# Vite fails if any project from root tsconfig.json references is missing
COPY api/tsconfig.json api/
COPY core/tsconfig.json core/
COPY extension/tsconfig.json extension/
COPY landings/tsconfig.json landings/
COPY loader-tests/tsconfig.json loader-tests/
COPY proxy/tsconfig.json proxy/
COPY scripts/tsconfig.json scripts/
COPY server/tsconfig.json server/
COPY test/tsconfig.json test/
COPY web/tsconfig.json web/

# Demo database loads real feeds, so web/demo/Dockerfile builds it separately.
# Run `pnpm update-docker` to take the latest one.
# Only files are copied from the demo image, so its x64 platform is fine on ARM.
# ghcr.io/hplush/slowreader-demo:latest
FROM --platform=linux/amd64 ghcr.io/hplush/slowreader-demo@sha256:c3556c43db6fc6d095d1f83374a8e9fc65129e152e0f2ab200d1cd34369146c3 AS demo

FROM base AS client
COPY api/package.json api/
COPY core/package.json core/
COPY extension/package.json extension/
COPY landings/package.json landings/
COPY web/package.json web/
COPY proxy/package.json proxy/
COPY server/package.json server/
RUN pnpm install --frozen-lockfile --ignore-scripts --prod -F web... -F landings
COPY docs/ docs/
COPY api/ api/
COPY core/ core/
COPY extension/ extension/
COPY landings/ landings/
COPY web/ web/
COPY --from=demo /screenshots/ landings/screenshots/
COPY --from=demo /demo.json /demo.sqlite web/public/
COPY --from=demo /og.jpg /og.jpg
# manifest.json takes the commit from it, since the image has no .git
ARG COMMIT
RUN --network=none OG_IMAGE=/og.jpg pnpm -F landings build && \
  pnpm -F web build:routes && \
  pnpm -F web build:web

FROM client AS storybook
# Storybook writes build time to project.json, which only Chromatic needs
RUN --network=none pnpm -F web build:visual && \
  rm web/storybook-static/project.json

FROM base AS server
COPY server/aaguids/ server/aaguids/
RUN node server/aaguids/download.ts
COPY api/package.json api/
COPY proxy/package.json proxy/
COPY server/package.json server/
ARG SOURCE_DATE_EPOCH
RUN pnpm install --frozen-lockfile --ignore-scripts --prod -F server... && \
  rm -r node_modules/.pnpm-store
COPY api/ api/
COPY proxy/ proxy/
COPY server/ server/

# cgr.dev/chainguard/nginx:latest
FROM cgr.dev/chainguard/nginx@sha256:9d34c0a9f349eaf64ec75b3e8c09774fa234152a03cee94121e09e7220e2a560 AS production

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later
ARG COMMIT
LABEL org.opencontainers.image.revision=$COMMIT

ENV NODE_ENV=production \
  LOGUX_HOST=0.0.0.0 \
  LOGUX_LOGGER=json

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY --from=base /usr/lib/libatomic.so.1 /usr/lib/libstdc++.so.6 /usr/lib/
COPY --from=ghcr.io/tarampampam/microcheck@sha256:c9f79cd408626de7c10f2d487d67339f49adf0ba61dde96ede65343269db1f85 /bin/httpcheck /usr/bin/httpcheck

COPY --from=client /app/web/nginx.conf /app/web/routes.regexp /etc/nginx/
COPY --from=client /app/web/dist/ /var/www/
# Workspace packages are symlinks to the folders next to node_modules/,
# so Node.js can strip their types
COPY --from=server /app/node_modules/ /var/app/node_modules/
COPY --from=server /app/api/ /var/app/api/
COPY --from=server /app/proxy/ /var/app/proxy/
COPY --from=server /app/server/ /var/app/server/
# Base image runs as nginx user, so WORKDIR before COPY would give
# the server user rights to replace code folders
WORKDIR /var/app

USER 65532

# nginx image stops by SIGQUIT, but Node.js needs SIGTERM for graceful exit
STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/local/bin/node", "/var/app/server/entrypoint.ts"]
CMD []

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/bin/httpcheck", "http://127.0.0.1:2553/health"]

# Staging and previews add Storybook on top of the same production layers
FROM production AS staging
COPY --from=storybook /app/web/storybook-static/ /var/www/ui/

# Default target for `docker build .`
FROM production
