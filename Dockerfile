# Single image for the app (web client with server) and proxy. ROLE environment
# variable chooses what to run, see server/entrypoint.ts.
#
# Every part is installed and built in its own stage with only its own
# dependencies, so a malicious web dependency can’t change the server code.

# cgr.dev/chainguard/wolfi-base:latest
FROM --platform=$BUILDPLATFORM cgr.dev/chainguard/wolfi-base@sha256:88a20e2d017bd20cdc0cb3910de603e7bea9512a6c351a8dd3c9df212ab03d73 AS tools

ENV NODE_VERSION=26.13.0 \
  NODE_CHECKSUM_X64=d28a96af6c38596f6d9d97c0ee531c13d238d757742387d1928de822d959e997 \
  NODE_CHECKSUM_ARM64=406fe3fbde1c054adff8b297c16fdb5af6659db327c1ac8acd46b56ef1af9a92 \
  PNPM_VERSION=12.17.0 \
  PNPM_CHECKSUM_X64=2c58959fd5df5cb9f4e72784c08a60ffc7ee558fed9b04b22254e29112203a51 \
  PNPM_CHECKSUM_ARM64=ce5a5b95a9974a0bbd713a5ef74416dbcd0e3fdf11f69ea92c5995b9c18ccb47

# Docker downloads them and checks the hash, so we need no curl
ADD --checksum=sha256:${NODE_CHECKSUM_X64} \
  https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz \
  /download/node-amd64.tar.xz
ADD --checksum=sha256:${NODE_CHECKSUM_ARM64} \
  https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-arm64.tar.xz \
  /download/node-arm64.tar.xz
ADD --checksum=sha256:${PNPM_CHECKSUM_X64} \
  https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-x64.tar.gz \
  /download/pnpm-amd64.tar.gz
ADD --checksum=sha256:${PNPM_CHECKSUM_ARM64} \
  https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-arm64.tar.gz \
  /download/pnpm-arm64.tar.gz

# Node.js and pnpm for both architectures in /tools/amd64 and /tools/arm64
RUN <<EOF
  # Exit immediately if a command fails
  set -euo pipefail

  for ARCH in amd64 arm64; do
    if [ "$ARCH" = "amd64" ]; then
      NODE_ARCH="x64"
    else
      NODE_ARCH="arm64"
    fi
    mkdir -p "/tools/$ARCH/bin" "/tools/$ARCH/share/pnpm"
    tar -xf "/download/node-$ARCH.tar.xz" -C "/tools/$ARCH/bin" \
      --strip-components=2 "node-v${NODE_VERSION}-linux-${NODE_ARCH}/bin/node"
    tar -xz -f "/download/pnpm-$ARCH.tar.gz" -C "/tools/$ARCH/share/pnpm"
    ln -s /usr/local/share/pnpm/pnpm "/tools/$ARCH/bin/pnpm"
  done
  rm -r /download
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

# Node.js for the image’s platform, for the server and the final image
# cgr.dev/chainguard/wolfi-base:latest
FROM cgr.dev/chainguard/wolfi-base@sha256:88a20e2d017bd20cdc0cb3910de603e7bea9512a6c351a8dd3c9df212ab03d73 AS target
ARG TARGETARCH
# Exact versions to get the same libraries in every build
RUN apk add --no-cache libatomic=16.2.0-r1 libstdc++=16.2.0-r1
COPY --from=tools /tools/${TARGETARCH}/ /usr/local/
COPY --from=tools /app/ /app/
WORKDIR /app

# Web assets are the same on ARM, and Node.js crashes in ARM emulation
# cgr.dev/chainguard/wolfi-base:latest
FROM --platform=$BUILDPLATFORM cgr.dev/chainguard/wolfi-base@sha256:88a20e2d017bd20cdc0cb3910de603e7bea9512a6c351a8dd3c9df212ab03d73 AS native
ARG BUILDARCH
RUN apk add --no-cache libatomic=16.2.0-r1 libstdc++=16.2.0-r1
COPY --from=tools /tools/${BUILDARCH}/ /usr/local/
COPY --from=tools /app/ /app/
WORKDIR /app

# Demo database loads real feeds, so web/demo/Dockerfile builds it separately.
# Run `pnpm update-docker` to take the latest one.
# Only files are copied from the demo image, so its x64 platform is fine on ARM.
# ghcr.io/hplush/slowreader-demo:latest
FROM --platform=linux/amd64 ghcr.io/hplush/slowreader-demo@sha256:96d72a79ba03118cfb75a2181f8c6da533fc4d0893e07bc1210e12c790c1f93b AS demo

FROM native AS client
COPY api/package.json api/
COPY core/package.json core/
COPY extension/package.json extension/
COPY landings/package.json landings/
COPY web/package.json web/
COPY proxy/package.json proxy/
COPY server/package.json server/
RUN pnpm install --frozen-lockfile --ignore-scripts --prod -F web... -F landings
COPY docs/ docs/
COPY CHANGELOG.md ./
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

FROM target AS server
COPY server/aaguids/ server/aaguids/
RUN node server/aaguids/download.ts
COPY api/package.json api/
COPY proxy/package.json proxy/
COPY server/package.json server/
ARG SOURCE_DATE_EPOCH
RUN pnpm install --frozen-lockfile --ignore-scripts --prod -F server... && \
  rm -r node_modules/.pnpm-store
RUN --network=none pnpm -F server... sbom --prod --sbom-format cyclonedx \
  --sbom-spec-version 1.6 > /server.cdx.json
COPY api/ api/
COPY proxy/ proxy/
COPY server/ server/

FROM client AS sbom
COPY --from=server /server.cdx.json /server.cdx.json
RUN --network=none node web/scripts/merge-sbom.ts /server.cdx.json

# cgr.dev/chainguard/nginx:latest
FROM cgr.dev/chainguard/nginx@sha256:16d0e55ffe62f55744d9b903d8eb57e533d0f660332a9fbb967d78b4e77c8bdb AS production

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later
ARG COMMIT
LABEL org.opencontainers.image.revision=$COMMIT

ENV NODE_ENV=production \
  LOGUX_HOST=0.0.0.0 \
  LOGUX_LOGGER=json

COPY --from=target /usr/local/bin/node /usr/local/bin/node
COPY --from=target /usr/lib/libatomic.so.1 /usr/lib/libstdc++.so.6 /usr/lib/
COPY --from=ghcr.io/tarampampam/microcheck@sha256:c9f79cd408626de7c10f2d487d67339f49adf0ba61dde96ede65343269db1f85 /bin/httpcheck /usr/bin/httpcheck

COPY --from=client /app/web/nginx.conf /app/web/routes.regexp /etc/nginx/
COPY --from=sbom /app/web/dist/ /var/www/
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
