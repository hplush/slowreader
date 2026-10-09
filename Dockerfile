# Single image for the app (web client with server) and proxy. ROLE environment
# variable chooses what to run, see server/entrypoint.ts.
#
# Every part is installed and built in its own stage with only its own
# dependencies, so a malicious web dependency can’t change the server code.

# cgr.dev/chainguard/wolfi-base:latest
FROM cgr.dev/chainguard/wolfi-base@sha256:05d24163df148be377275af8374c16523a1dc7e19bf4f1c689784791553c5e45 AS base

ENV NODE_VERSION=26.11.1 \
  NODE_CHECKSUM_X64=3883bfc73f9a680ca4eab04b196068aaaab1373ffa77d8fc1a4408222495b651 \
  PNPM_VERSION=12.11.0 \
  PNPM_CHECKSUM_X64=95225136257d2082718f67fcdcdc07e73bb49242d1a74bec0ff180c67ef29f18

# Exact versions to get the same libraries in every build
RUN apk add --no-cache curl libatomic=16.2.0-r1 libstdc++=16.2.0-r1

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

  curl "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-x64.tar.gz" \
    --fail --show-error --location --silent --output /pnpm.tar.gz
  echo "$PNPM_CHECKSUM_X64 /pnpm.tar.gz" | sha256sum -c
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
# ghcr.io/hplush/slowreader-demo:latest
FROM ghcr.io/hplush/slowreader-demo@sha256:da620b36e3cb81970a12d271cfd2d2889660fb0c051aea0cd73d6f644813f337 AS demo

FROM base AS client
COPY api/package.json api/
COPY core/package.json core/
COPY extension/package.json extension/
COPY landings/package.json landings/
COPY web/package.json web/
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
# pnpm-workspace.yaml puts the store into node_modules/, and pnpm writes
# install time to its state files, which Node.js does not need
RUN pnpm install --frozen-lockfile --ignore-scripts --prod -F server... && \
  rm -r node_modules/.pnpm-store node_modules/.modules.yaml \
    node_modules/.pnpm-workspace-state-v1.json
COPY api/ api/
COPY proxy/ proxy/
COPY server/ server/

# cgr.dev/chainguard/nginx:latest
FROM cgr.dev/chainguard/nginx@sha256:4d1a034e20cf62edc65b279e83025deec3dfb38bee92cde9e5d51b44752fd7f9 AS production

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

WORKDIR /var/app
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
COPY --from=server /app/node_modules/ node_modules/
COPY --from=server /app/api/ api/
COPY --from=server /app/proxy/ proxy/
COPY --from=server /app/server/ server/

USER 65532

# nginx image stops by SIGQUIT, but Node.js needs SIGTERM for graceful exit
STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/local/bin/node", "/var/app/server/entrypoint.ts"]
CMD []

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/bin/httpcheck", "http://localhost:2553/health"]

# Staging and previews add Storybook on top of the same production layers
FROM production AS staging
COPY --from=storybook /app/web/storybook-static/ /var/www/ui/

# Default target for `docker build .`
FROM production
