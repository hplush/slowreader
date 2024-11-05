# syntax=docker/dockerfile:1.6
FROM registry.access.redhat.com/ubi9/ubi:9.4 as builder

ENV NODE_VERSION 22.11.0
ENV NODE_CHECKSUM sha256:4f862bab52039835efbe613b532238b6e4dde98d139a34e6923193e073438b13

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz /node.tar.gz
RUN tar --remove-files -C /usr/local/ -xz --strip-components=1 -f /node.tar.gz

FROM registry.access.redhat.com/ubi9/ubi-micro:9.4

COPY --from=builder /usr/local/bin/node /usr/bin/node
COPY --from=builder /usr/lib64/libstdc++.so.6 /usr/lib64/libstdc++.so.6

ENV NODE_ENV production
ENV LOGUX_HOST 0.0.0.0
ENV LOGUX_LOGGER json
WORKDIR /var/app
COPY ./dist/ /var/app/
COPY ./web/ /var/web/

USER 1000:1000

CMD "node" "--import" "tsx" "index.ts"
