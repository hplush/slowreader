FROM cgr.dev/chainguard/wolfi-base:latest as base

ENV NODE_VERSION 22.14.0
ENV NODE_CHECKSUM sha256:69b09dba5c8dcb05c4e4273a4340db1005abeafe3927efda2bc5b249e80437ec

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
    "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic:latest
WORKDIR /var/app
ENV NODE_ENV production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "server.ts"]
