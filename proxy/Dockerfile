FROM cgr.dev/chainguard/wolfi-base@sha256:d274ac44e36d579e9c66c1f940182b1a02e91aac77305579528a05b1174d63c9 AS base

ENV NODE_VERSION=24.10.0 \
  NODE_CHECKSUM=sha256:2642f4428869aca32443660fd71b3918e2be1277a899bdcaeb64c93b54b5af17

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:95b1cbd5981d851d278753e8a0706281e0b631ab510eb7bb275b56d681b7d17f
WORKDIR /var/app
ENV NODE_ENV=production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["server.ts"]
