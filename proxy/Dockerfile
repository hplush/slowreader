FROM docker.io/alpine:3.21.3 as base

ENV NODE_VERSION 22.14.0
ENV NODE_CHECKSUM sha256:87f163387ac85df69df6eeb863a6b6a1aa789b49cda1c495871c0fe360634db3

RUN apk add --no-cache libstdc++
ADD --checksum=$NODE_CHECKSUM https://unofficial-builds.nodejs.org/download/release/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64-musl.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
    "node-v${NODE_VERSION}-linux-x64-musl/bin/node" && rm "node.tar.xz"

FROM scratch
WORKDIR /var/app
ENV NODE_ENV production

COPY --from=base /bin/sh /bin/sh
COPY --from=base /lib/ld-musl-x86_64.so.1 /lib/ld-musl-x86_64.so.1
COPY --from=base /usr/lib/libgcc_s.so.1 /usr/lib/libgcc_s.so.1
COPY --from=base /usr/lib/libstdc++.so.6 /usr/lib/libstdc++.so.6
COPY --from=base /usr/local/bin/node /usr/local/bin/node

COPY ./dist/ /var/app/

USER 1000:1000

CMD "node" "--experimental-strip-types" \
  "--disable-warning=ExperimentalWarning" "server.ts"
