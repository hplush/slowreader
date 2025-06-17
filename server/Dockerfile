FROM cgr.dev/chainguard/wolfi-base:latest@sha256:f90b2efe19a8dcbb70d0d9056d15cc6b112103f04839dc319e77fa7bf1451ac9 as base

ENV NODE_VERSION 22.16.0
ENV NODE_CHECKSUM sha256:f4cb75bb036f0d0eddf6b79d9596df1aaab9ddccd6a20bf489be5abe9467e84e

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
    "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic:latest@sha256:006f251a4521c668aff720a4d12a326c59fc35f6ebf3be6e143cdd41111442af
WORKDIR /var/app
ENV NODE_ENV production
ENV LOGUX_HOST 0.0.0.0
ENV LOGUX_LOGGER json

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/
COPY ./web/ /var/web/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--import", "tsx", "index.ts"]
