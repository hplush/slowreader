FROM cgr.dev/chainguard/wolfi-base@sha256:f5e04a31705ccde0d1f4ff11abde7b4a528a993b2571785616bdd94aa066f4c2 AS base

ENV NODE_VERSION=24.5.0 \
  NODE_CHECKSUM=sha256:32edb1f2aeaf8ea0d484af33bf3b5d8330d7d33c9cd8c70f811b8a643822e613

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:ffeb33e6c8bbefaa3a9f3c9c4445281069a106b05245ee26a745d07f0d21c5f7
WORKDIR /var/app
ENV NODE_ENV=production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["server.ts"]
