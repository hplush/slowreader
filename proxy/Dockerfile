# syntax=docker/dockerfile:1.6
FROM registry.access.redhat.com/ubi9/ubi:9.4 as builder

ENV NODE_VERSION 22.13.0
ENV NODE_CHECKSUM sha256:9a33e89093a0d946c54781dcb3ccab4ccf7538a7135286528ca41ca055e9b38f

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
