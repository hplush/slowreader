FROM cgr.dev/chainguard/wolfi-base@sha256:81ea7e4dfe13032418ef0c3fc9e7786dfe33a34718c7c6f50221ac00bf3749c9 AS base

ENV NODE_VERSION=24.11.0 \
  NODE_CHECKSUM=sha256:46da9a098973ab7ba4fca76945581ecb2eaf468de347173897044382f10e0a0a

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:dc9ca82db4ee2554cdd17e7bb5bc7a53abc0a7f445406b46f6cc10edb434f7e7
WORKDIR /var/app
ENV NODE_ENV=production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["server.ts"]
