FROM cgr.dev/chainguard/wolfi-base:latest@sha256:a602b58f6147bc78354c84976290c0991ef0bb0bc04d888bc8f6ff9426600745 as base

ENV NODE_VERSION 22.14.0
ENV NODE_CHECKSUM sha256:69b09dba5c8dcb05c4e4273a4340db1005abeafe3927efda2bc5b249e80437ec

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
    "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic:latest@sha256:bae567a8d55e980e0a4814c4568b4bf3f77862da982126e8801d33b063c32acc
WORKDIR /var/app
ENV NODE_ENV production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "server.ts"]
