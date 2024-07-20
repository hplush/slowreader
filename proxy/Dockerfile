# syntax=docker/dockerfile:1.6
FROM registry.access.redhat.com/ubi9/ubi:9.4 as builder

ENV NODE_VERSION 22.5.1
ENV NODE_CHECKSUM sha256:2a7b8b8aa5c739ae55233d59f78736911a8a5da5ea1c63f0e843da270d039499

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz /node.tar.gz
RUN tar --remove-files -C /usr/local/ -xz --strip-components=1 -f /node.tar.gz

FROM registry.access.redhat.com/ubi9/ubi-micro:9.4

COPY --from=builder /usr/local/bin/node /usr/bin/node
COPY --from=builder /usr/lib64/libstdc++.so.6 /usr/lib64/libstdc++.so.6

ENV NODE_ENV production
WORKDIR /var/www
COPY ./dist/ /var/www/

USER 1000:1000

CMD "node" "--enable-source-maps" "index.mjs"
