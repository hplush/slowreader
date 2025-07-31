FROM cgr.dev/chainguard/wolfi-base@sha256:27f8e02ca83a15d77877238da5c9f54c8fb91fc8ab376a8c42a1bd2d644e866d AS base

ENV NODE_VERSION=24.4.1 \
  NODE_CHECKSUM=sha256:7e067b13cd0dc7ee8b239f4ebe1ae54f3bba3a6e904553fcb5f581530eb8306d

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:ec2d67a6b889ad030d048b891c30e77812743edfd2827e5e06d1b65a589d3519
WORKDIR /var/app
ENV NODE_ENV=production \
  LOGUX_HOST=0.0.0.0 \
  LOGUX_LOGGER=json

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/
COPY ./web/ /var/web/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--import", "tsx", "index.ts"]
