FROM cgr.dev/chainguard/wolfi-base@sha256:e735a9b94027e0d33e0056f94cfdca6d88adfbdf1ffa96bdbed0d43dc72fd179 AS base

ENV NODE_VERSION=24.13.0 \
  NODE_CHECKSUM=sha256:e798599612f4bb71333a3397ab0d095fd62214e115aea45aa858a145fc72d67e

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:2c50486a00691ab9bf245c5e5e456777ff4bb25c8635be898bd5e2f0ab72eedb
WORKDIR /var/app
ENV NODE_ENV=production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["server.ts"]
