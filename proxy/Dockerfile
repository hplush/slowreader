FROM registry.access.redhat.com/ubi9/ubi:9.4 as builder

ENV NODE_VERSION 22.2.0
ENV NODE_CHECKSUM sha256:2c6eaf8bfd0f886ed8764ffce19c795e909639105e4056b1d9f8f917bad12cf1

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz /node.tar.gz
RUN tar --remove-files -C / -xz --strip-components=1 -f /node.tar.gz

FROM registry.access.redhat.com/ubi9/ubi-micro:9.4

COPY --from=builder /usr/local/bin/node /usr/bin/node
COPY --from=builder /usr/lib64/libstdc++.so.6 /usr/lib64/libstdc++.so.6

ENV NODE_ENV production
WORKDIR /var/www
COPY ./dist/ /var/www/

USER 1000:1000

CMD "node" "--enable-source-maps" "index.mjs"
