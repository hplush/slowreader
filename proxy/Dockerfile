FROM cgr.dev/chainguard/wolfi-base@sha256:7eaf3926b25d9434d4cb9d46b844b75613d59782dc2f43afad93bd13736457dd AS base

ENV NODE_VERSION=24.8.0 \
  NODE_CHECKSUM=sha256:2598641d188b41793930917f1a99a81c9615856b4205d408a44ab676c1acbb3d

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:ff2bd1d355fd5196879e0d73735d70f4c712b820f38bc5cf2bfeac24571dd9a9
WORKDIR /var/app
ENV NODE_ENV=production

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["server.ts"]
