FROM cgr.dev/chainguard/wolfi-base@sha256:6a2ca28ea7a35be7e685cee1fe61488b5395bd439cd18426ae3d61150be01478 as base

ENV NODE_VERSION=24.4.1 \
  NODE_CHECKSUM=sha256:7e067b13cd0dc7ee8b239f4ebe1ae54f3bba3a6e904553fcb5f581530eb8306d

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:63370c92a78f71f206756d61102c746da3d04e0282255b6a4ce790af1f5841b5
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
