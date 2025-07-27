FROM cgr.dev/chainguard/wolfi-base@sha256:ecf84c27cdda54db7eea34a83fe81a99fac2683d1236215bbd9a357147350d4f AS base

ENV NODE_VERSION=24.4.1 \
  NODE_CHECKSUM=sha256:7e067b13cd0dc7ee8b239f4ebe1ae54f3bba3a6e904553fcb5f581530eb8306d

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:a1ffa624aaef8380c55e922f0232659396b9a4c2896343dfc7f6b355b2b12ab2
WORKDIR /var/app
ENV NODE_ENV=production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "server.ts"]
