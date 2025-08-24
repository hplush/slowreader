FROM cgr.dev/chainguard/wolfi-base@sha256:426f62795f26b6a003b90deebc6ce05139e1766f9d279b8aa5cc9854997b890d AS base

ENV NODE_VERSION=24.6.0 \
  NODE_CHECKSUM=sha256:fda6f6a00759eea0a27e34fcdfdd09c2b0413855edaa7f746246cf81c0186e26

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:f0f85291e58825270e825cffec00a7b140e688e335c4a8a0be026eb02c29889c
WORKDIR /var/app
ENV NODE_ENV=production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["server.ts"]
