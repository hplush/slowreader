FROM cgr.dev/chainguard/wolfi-base@sha256:86ff705cc2011ce4cdeaff6aa90c2b6753c1eb912a94f7be40206ac20a43ded1 AS base

ENV NODE_VERSION=24.10.0 \
  NODE_CHECKSUM=sha256:2642f4428869aca32443660fd71b3918e2be1277a899bdcaeb64c93b54b5af17

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:e421d8d898555bf5d0f7e10b4b3b99b5cf42b8958d75c5a2fcfb4f74166c5b62
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
