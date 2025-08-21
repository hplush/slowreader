FROM cgr.dev/chainguard/wolfi-base@sha256:0f337abe85ea750903046ad6816608322b1e3c348f7747842026b6c2d3adda0b AS base

ENV NODE_VERSION=24.6.0 \
  NODE_CHECKSUM=sha256:fda6f6a00759eea0a27e34fcdfdd09c2b0413855edaa7f746246cf81c0186e26

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:f0f85291e58825270e825cffec00a7b140e688e335c4a8a0be026eb02c29889c
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
