FROM cgr.dev/chainguard/wolfi-base:latest@sha256:33fab0f76deae9b1bb3374c6a8ccbb74f62d8ea642a969b43e16aed163ae12f9 as base

ENV NODE_VERSION 24.2.0
ENV NODE_CHECKSUM sha256:91a0794f4dbc94bc4a9296139ed9101de21234982bae2b325e37ebd3462273e5

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
    "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic:latest@sha256:d35ab2990e82d8118639a225a419ea10464406484c50e9965c7dd11cf701d2fd
WORKDIR /var/app
ENV NODE_ENV production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "server.ts"]
