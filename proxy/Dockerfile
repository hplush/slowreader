FROM cgr.dev/chainguard/wolfi-base@sha256:f6959a1b0ed7e6f4696f5cd8373b28846494cb9272a14dc0ddc0db94d00e7344 AS base

ENV NODE_VERSION=24.13.0 \
  NODE_CHECKSUM=sha256:e798599612f4bb71333a3397ab0d095fd62214e115aea45aa858a145fc72d67e

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:3f5dc064fa077619b186d21a426c07fb3868668ffe104db8ba3e46347a80a1d3
WORKDIR /var/app
ENV NODE_ENV=production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["server.ts"]
