FROM cgr.dev/chainguard/wolfi-base:latest@sha256:cfde0da06ce9429e1301b0d93c18cb4c94b71b3beb643321b006f9e173867f9e as base

ENV NODE_VERSION 22.15.1
ENV NODE_CHECKSUM sha256:7dca2ab34ec817aa4781e2e99dfd34d349eff9be86e5d5fbaa7e96cae8ee3179

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
    "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic:latest@sha256:6900931955af4c6b87d7bf72ab1a5bfc5b2df1013bae1773bc8d655f3840e907
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
