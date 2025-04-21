FROM cgr.dev/chainguard/wolfi-base:latest@sha256:c7995f6d94e13cb77cbfa333dd75a783358099178e590fef6dfdc0347a90fecd as base

ENV NODE_VERSION 22.14.0
ENV NODE_CHECKSUM sha256:69b09dba5c8dcb05c4e4273a4340db1005abeafe3927efda2bc5b249e80437ec

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
    "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic:latest@sha256:2af6bbafee31adb94097cc647e4769a62249cc93dbf771e707b4cb5898097887
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
