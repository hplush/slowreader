FROM cgr.dev/chainguard/wolfi-base@sha256:7a83ab2fd198dad88e15fa1b8b07bd479e98b20da85dd50e4a43374f7b002a10 AS base

ENV NODE_VERSION=24.11.0 \
  NODE_CHECKSUM=sha256:46da9a098973ab7ba4fca76945581ecb2eaf468de347173897044382f10e0a0a

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:6ee4f3ed02da2527ec7a6676f0f5fd1dd31da37b33d14e52693f8fa7dba8baa1
WORKDIR /var/app
ENV NODE_ENV=production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["server.ts"]
