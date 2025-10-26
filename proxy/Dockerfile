FROM cgr.dev/chainguard/wolfi-base@sha256:914e2a46c617144692dfcf16afb3fa1865c8e2ab44c47675f5a6c7f0b8c63ba8 AS base

ENV NODE_VERSION=24.10.0 \
  NODE_CHECKSUM=sha256:2642f4428869aca32443660fd71b3918e2be1277a899bdcaeb64c93b54b5af17

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:6d288e69e1e6e21bd5c672afa7de77e8b86782c1ff0dd8308e00514f69a10930
WORKDIR /var/app
ENV NODE_ENV=production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["server.ts"]
