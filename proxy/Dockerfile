FROM cgr.dev/chainguard/wolfi-base@sha256:638cb97e5d09a5d63fc5361b78a0f7bbdedc34752f98eb1d96cc6e9539e98b1a as base

ENV NODE_VERSION 24.2.0
ENV NODE_CHECKSUM sha256:91a0794f4dbc94bc4a9296139ed9101de21234982bae2b325e37ebd3462273e5

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:ee0c12acfc614acd7c18e5679f4ae03c7dc918e93b6772e46aa2e43bb3a54908
WORKDIR /var/app
ENV NODE_ENV production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "server.ts"]
