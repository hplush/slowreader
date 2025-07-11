FROM cgr.dev/chainguard/wolfi-base@sha256:6a2ca28ea7a35be7e685cee1fe61488b5395bd439cd18426ae3d61150be01478 as base

ENV NODE_VERSION 24.4.0
ENV NODE_CHECKSUM sha256:af59f88ed35c68f7196dc94938e74327e3abe62055b831746de5b23bd7e1670a

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:63370c92a78f71f206756d61102c746da3d04e0282255b6a4ce790af1f5841b5
WORKDIR /var/app
ENV NODE_ENV production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "server.ts"]
