# syntax=docker/dockerfile:1.6
FROM registry.access.redhat.com/ubi9/ubi:9.4 as builder

ENV NODE_VERSION 22.8.0
ENV NODE_CHECKSUM sha256:a0bc969f61b96575a4b2cdd239729aa3e721384fa9ca3fb926a9582c019c1bbc

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz /node.tar.gz
RUN tar --remove-files -C /usr/local/ -xz --strip-components=1 -f /node.tar.gz

FROM registry.access.redhat.com/ubi9/ubi-micro:9.4

COPY --from=builder /usr/local/bin/node /usr/bin/node
COPY --from=builder /usr/lib64/libstdc++.so.6 /usr/lib64/libstdc++.so.6

ENV NODE_ENV production
WORKDIR /var/apps
COPY ./dist/ /var/app/

USER 1000:1000

CMD "node" "--experimental-strip-types" \
  "--disable-warning=ExperimentalWarning" "server.ts"
