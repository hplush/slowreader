FROM cgr.dev/chainguard/wolfi-base@sha256:a1f696077fdb7502a777e6637eb9eeafbc417afc6c73c617e54ea631794372c1 AS base

ENV NODE_VERSION=24.10.0 \
  NODE_CHECKSUM=sha256:2642f4428869aca32443660fd71b3918e2be1277a899bdcaeb64c93b54b5af17

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:48f9559092e33f77ff35fa4b3c75e8bf661f8b680199b8039bcbcb2f9f9448d4
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
