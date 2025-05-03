FROM cgr.dev/chainguard/wolfi-base:latest@sha256:c7995f6d94e13cb77cbfa333dd75a783358099178e590fef6dfdc0347a90fecd as base

ENV NODE_VERSION 22.15.0
ENV NODE_CHECKSUM sha256:dafe2e8f82cb97de1bd10db9e2ec4c07bbf53389b0799b1e095a918951e78fd4

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
    "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic:latest@sha256:2af6bbafee31adb94097cc647e4769a62249cc93dbf771e707b4cb5898097887
WORKDIR /var/app
ENV NODE_ENV production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "server.ts"]
