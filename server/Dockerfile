FROM cgr.dev/chainguard/wolfi-base@sha256:89af741cf01c76fe467d3928a906daab06659d75b97237567217f905d2471e0a as base

ENV NODE_VERSION 24.3.0
ENV NODE_CHECKSUM sha256:a962afadaa8b94bae8bff87ddd6c11f7aae621032424ef05c0a4fe2537fa4de0

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:09a5978ad80753564573d467bc777922812217d937dbc6463c87bb449ed27a0a
WORKDIR /var/app
ENV NODE_ENV production
ENV LOGUX_HOST 0.0.0.0
ENV LOGUX_LOGGER json

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/
COPY ./web/ /var/web/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--import", "tsx", "index.ts"]
