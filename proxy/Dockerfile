# syntax=docker/dockerfile:1.6
FROM registry.access.redhat.com/ubi9/ubi:9.4 as builder

ENV NODE_VERSION 22.14.0
ENV NODE_CHECKSUM sha256:9d942932535988091034dc94cc5f42b6dc8784d6366df3a36c4c9ccb3996f0c2

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz /node.tar.gz
RUN tar --remove-files -C /usr/local/ -xz --strip-components=1 -f /node.tar.gz

FROM registry.access.redhat.com/ubi9/ubi-micro:9.4

COPY --from=builder /usr/local/bin/node /usr/bin/node
COPY --from=builder /usr/lib64/libstdc++.so.6 /usr/lib64/libstdc++.so.6

ENV NODE_ENV production
WORKDIR /var/app
COPY ./dist/ /var/app/

USER 1000:1000

CMD "node" "--experimental-strip-types" \
  "--disable-warning=ExperimentalWarning" "server.ts"
