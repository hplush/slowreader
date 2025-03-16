FROM alpine:3.21.3

ENV NODE_VERSION 22.14.0
ENV NODE_CHECKSUM sha256:87f163387ac85df69df6eeb863a6b6a1aa789b49cda1c495871c0fe360634db3

ADD --checksum=$NODE_CHECKSUM https://unofficial-builds.nodejs.org/download/release/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64-musl.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
    "node-v${NODE_VERSION}-linux-x64-musl/bin/node" && rm "node.tar.xz"
RUN apk add --no-cache libstdc++

ENV NODE_ENV production
ENV LOGUX_HOST 0.0.0.0
ENV LOGUX_LOGGER json
WORKDIR /var/app
COPY ./dist/ /var/app/
COPY ./web/ /var/web/

USER 1000:1000

CMD "node" "--import" "tsx" "index.ts"
