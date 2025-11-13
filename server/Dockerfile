FROM cgr.dev/chainguard/wolfi-base@sha256:77891a12dc762228955294f2207ee1cbd2b127f18dc7c7458203116288dce828 AS base

ENV NODE_VERSION=24.11.1 \
  NODE_CHECKSUM=sha256:60e3b0a8500819514aca603487c254298cd776de0698d3cd08f11dba5b8289a8

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:381cc5992555a7ebb75f2a500d334e2a1efa0f35fb7e0edafccb6bb0bef264ae
WORKDIR /var/app
ENV NODE_ENV=production \
  LOGUX_HOST=0.0.0.0 \
  LOGUX_LOGGER=json

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/
COPY ./web/ /var/web/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--import", "tsx", "index.ts"]
